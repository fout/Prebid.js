import {spec} from 'modules/freakoutBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import prebid from '../../../package.json';

const ENDPOINT = 'https://ad.rfp.fout.jp/ad';
const ADAPTER_VERSION = '1.0.0';

describe('FreakOutAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      bidder: 'freakout',
      params: {
        adspot_id: 'ABCD1234',
        ad_type: 14
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'freakout',
        params: {
          adspot_id: 'ABCD1234',
          ad_type: 14
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250],
          [320, 50],
          [320, 100],
        ],
        bidId: '2b84475b5b636e',
        bidderRequestId: '1f4001782ac16c',
        auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
        transactionId: '791e9d84-af92-4903-94da-24c7426d9d0c'
      },
    ];

    it('sends bid request to ENDPOINT via GET', function () {
      const bidderRequest = {
        refererInfo: {
          referer: 'https://example.com',
        },
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].data).to.equal(`adspot_id=ABCD1234&ad_type=14&media_url=https%3A%2F%2Fexample.com&hb=prebidjs&pb_ver=${prebid.version}&pb_adapter_ver=${ADAPTER_VERSION}&pb_tid=791e9d84-af92-4903-94da-24c7426d9d0c&pb_bid=2b84475b5b636e&cur=JPY&sizes=300x250%2C320x50%2C320x100&`);
    });
  });

  describe('interpretResponse', function () {
    const bidderRequests = [
      {
        bidder: 'freakout',
        params: {
          adspot_id: 'ABCD1234',
          ad_type: 14
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250],
          [320, 50],
          [320, 100],
        ],
        bidId: '2b84475b5b636e',
        bidderRequestId: '1f4001782ac16c',
        auctionId: 'aba03555-4802-4c45-9f15-05ffa8594cff',
        transactionId: '791e9d84-af92-4903-94da-24c7426d9d0c',
      }
    ];

    it('should get correct banner bid response', function () {
      const response = {
        sync_urls: [
          'https://sync.example.com/1.html',
          'https://sync.example.com/2.html',
        ],
        sync_iframe_urls: [
          'https://sync.example.com/3.html',
          'https://sync.example.com/4.html',
        ],
        items: [
          {
            creative_id: 'creative-1',
            creative_html: '<div></div>',
            creative_width: '300',
            creative_height: '250',
            ttl: 200,
            cpm: 30,
            cur: 'JPY',
            pb_bid: '2b84475b5b636e',
          },
        ],
      };

      const expectedResponse = {
        // ad: '<div></div>',
        cpm: 30,
        creativeId: 'creative-1',
        currency: 'JPY',
        height: 250,
        netRevenue: true,
        requestId: '2b84475b5b636e',
        ttl: 200,
        width: 300,
      };

      const result = spec.interpretResponse({body: response}, bidderRequests);
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include(expectedResponse);
      expect(result[0].ad).to.be.a('string');
    });

    it('handles no bid responses', function () {
      const response = '';

      const result = spec.interpretResponse({body: response}, bidderRequests);
      expect(result).to.have.lengthOf(0);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse = {
      body: {
        sync_urls: [
          'https://sync1.example.com',
          'https://sync2.example.com',
        ],
        sync_iframe_urls: [
          'https://sync3.example.com',
          'https://sync4.example.com',
        ],
      },
    };

    it('should return pixel syncs', function () {
      const syncs = spec.getUserSyncs({pixelEnabled: true, iframeEnabled: true}, [bidResponse]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://sync1.example.com',
        },
        {
          type: 'image',
          url: 'https://sync2.example.com',
        },
        {
          type: 'iframe',
          url: 'https://sync3.example.com',
        },
        {
          type: 'iframe',
          url: 'https://sync4.example.com',
        },
      ]);
    });
  })
});
