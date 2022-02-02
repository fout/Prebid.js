# Overview

```
Module Name: FreakOut Bid Adapter
Module Type: Bidder Adapter
Maintainer:  rfp-tech@fout.jp
```

# Description

Connects to FreakOut exchange for bids.

FreakOut bid adapter supports Banner.

# Test Parameters
```
var adUnits = [
    // Banner adUnit
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250],
                    [320, 50],
                    [320, 100]
                ]
            }
        },
        bids: [{
            bidder: 'freakout',
            params: {
                adspot_id: 'NDgxOjUx',
                ad_type: 14
            }
        }]
    }
];
```
