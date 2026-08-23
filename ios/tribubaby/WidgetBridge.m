#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetBridge, NSObject)

RCT_EXTERN_METHOD(saveLastBottle:(nonnull NSInteger)ml
                  milkType:(NSString *)milkType
                  timestamp:(double)timestamp)

RCT_EXTERN_METHOD(savePremiumStatus:(BOOL)isPremium)

RCT_EXTERN_METHOD(startNursingActivity:(NSDictionary *)payload)

RCT_EXTERN_METHOD(updateNursingActivity:(NSDictionary *)payload)

RCT_EXTERN_METHOD(endNursingActivity)

RCT_EXTERN_METHOD(hasNursingActivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(consumeNursingKillFlag:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
