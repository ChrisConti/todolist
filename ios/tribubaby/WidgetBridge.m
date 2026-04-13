#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetBridge, NSObject)

RCT_EXTERN_METHOD(saveLastBottle:(nonnull NSInteger)ml
                  milkType:(NSString *)milkType
                  timestamp:(double)timestamp)

@end
