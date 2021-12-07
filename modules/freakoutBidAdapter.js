import {registerBidder} from '../src/adapters/bidderFactory.js';
import {tryAppendQueryString, isEmpty} from '../src/utils.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'freakout';
const ENDPOINT = 'https://ad.rfp.fout.jp/ad';
const ADAPTER_VERSION = '1.0.0';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.adspot_id);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {*} bidderRequest
   * @return {ServerRequest[]} Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const serverRequests = [];

    let endpointUrl = config.getConfig(`${BIDDER_CODE}.endpoint_url`);

    for (let i = 0; i < validBidRequests.length; i++) {
      const req = validBidRequests[i];

      let query = '';
      query = tryAppendQueryString(query, 'adspot_id', req.params.adspot_id);
      query = tryAppendQueryString(query, 'ad_type', req.params.ad_type);
      query = tryAppendQueryString(query, 'media_url', bidderRequest.refererInfo.referer);
      query = tryAppendQueryString(query, 'hb', 'prebidjs');
      query = tryAppendQueryString(query, 'pb_ver', '$prebid.version$');
      query = tryAppendQueryString(query, 'pb_adapter_ver', ADAPTER_VERSION);
      query = tryAppendQueryString(query, 'pb_tid', req.transactionId);
      query = tryAppendQueryString(query, 'pb_bid', req.bidId);
      query = tryAppendQueryString(query, 'cur', getCurrency());
      query = tryAppendQueryString(query, 'sizes', getSizes(req));

      serverRequests.push({
        method: 'GET',
        url: endpointUrl || ENDPOINT,
        data: query,
        adspotId: req.params.adspot_id
      });
    }

    return serverRequests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {ServerRequest} serverRequest
   * @return {Array<Object>} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, serverRequest) {
    const body = serverResponse.body;
    if (isEmpty(body)) {
      return [];
    }

    const adspotId = serverRequest.adspotId;

    const ad = body.items[0];
    const creative = makeCreative(adspotId, body);

    const bid = {
      requestId: ad.pb_bid,
      cpm: Number(ad.cpm),
      currency: ad.cur,
      width: Number(ad.creative_width),
      height: Number(ad.creative_height),
      ad: creative,
      ttl: Number(ad.ttl) || 300,
      creativeId: ad.creative_id,
      netRevenue: true,
    };
    if (ad.vast_xml) {
      bid.vastXml = ad.vast_xml;
    }

    return [bid];
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];

    if (serverResponses.length === 0) {
      return syncs;
    }

    serverResponses.forEach(res => {
      const body = res.body;
      if (syncOptions.pixelEnabled && Array.isArray(body.sync_urls)) {
        body.sync_urls.forEach(url => {
          syncs.push({
            type: 'image',
            url: url
          })
        });
      }
      if (syncOptions.iframeEnabled && Array.isArray(body.sync_iframe_urls)) {
        body.sync_iframe_urls.forEach(url => {
          syncs.push({
            type: 'iframe',
            url: url
          })
        });
      }
    });

    return syncs;
  }
};

/**
 * @param {BidRequest} req
 * @return {string|null}
 */
function getSizes(req) {
  /** @type {string[][]|undefined} */
  const sizes = req.sizes;
  if (!sizes || sizes.length < 1) return null;
  return sizes.filter(x => x.length === 2)
    .map(x => `${x[0]}x${x[1]}`)
    .join(',');
}

/**
 * @return {string} USD or JPY
 */
function getCurrency() {
  if (config.getConfig('currency.adServerCurrency') &&
    config.getConfig('currency.adServerCurrency').toUpperCase() === 'USD') {
    return 'USD';
  }
  return 'JPY';
}

/**
 * @param {string} adspotId
 * @param {*} body
 */
function makeCreative(adspotId, body) {
  return `<div><ins data-rfp-display-adspot-id="${adspotId}"></ins></div>` +
    `<script id="rfp-ad-response-${adspotId}" type="application/json">${safeJSONString(JSON.stringify(body))}</script>` +
    `<script src="https://js.rfp.fout.jp/rfp-display.js"></script>` +
    `<script>RFP.Display.Default.lazyLoading(document.querySelector("[data-rfp-display-adspot-id=${adspotId}]").parentElement, {offline:true})</script>`;
}

function safeJSONString(s) {
  return s.replace(/&/g, '\\u0026')
    .replace(/>/g, '\\u003e')
    .replace(/</g, '\\u003c')
    .replace(/'/g, '\\u0027');
}

registerBidder(spec);
