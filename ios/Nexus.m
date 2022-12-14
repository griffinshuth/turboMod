#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(Nexus, RCTEventEmitter)

RCT_EXTERN_METHOD(configure)
RCT_EXTERN_METHOD(scanAndPair:(NSString *)name)
RCT_EXTERN_METHOD(scanAndTransmit: (NSString *)name)
RCT_EXTERN_METHOD(stopScan)

@end
