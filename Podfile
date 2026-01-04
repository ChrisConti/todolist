platform :ios, '11.0'
project 'tribubaby/tribubaby.xcodeproj'

use_modular_headers! # Enable modular headers globally

require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

target 'tribubaby' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true # Hermes is enabled by default
  )

  # React Native dependencies
  pod 'React', :path => '../node_modules/react-native'
  pod 'React-Core', :path => '../node_modules/react-native/React'
  pod 'React-RCTActionSheet', :path => '../node_modules/react-native/Libraries/ActionSheetIOS'
  pod 'React-RCTAnimation', :path => '../node_modules/react-native/Libraries/NativeAnimation'
  pod 'React-RCTBlob', :path => '../node_modules/react-native/Libraries/Blob'
  pod 'React-RCTImage', :path => '../node_modules/react-native/Libraries/Image'
  pod 'React-RCTLinking', :path => '../node_modules/react-native/Libraries/LinkingIOS'
  pod 'React-RCTNetwork', :path => '../node_modules/react-native/Libraries/Network'
  pod 'React-RCTSettings', :path => '../node_modules/react-native/Libraries/Settings'
  pod 'React-RCTText', :path => '../node_modules/react-native/Libraries/Text'
  pod 'React-RCTVibration', :path => '../node_modules/react-native/Libraries/Vibration'
  pod 'React-RCTWebSocket', :path => '../node_modules/react-native/Libraries/WebSocket'
  pod 'RNScreens', :path => '../node_modules/react-native-screens'
  pod 'react-native-safe-area-context', :path => '../node_modules/react-native-safe-area-context'

  # Third-party dependencies
  pod 'DoubleConversion', :podspec => 'https://raw.githubusercontent.com/facebook/react-native/0.64-stable/third-party-podspecs/DoubleConversion.podspec'
  pod 'Yoga', :path => '../node_modules/react-native/ReactCommon/yoga'
  pod 'glog', :git => 'https://github.com/google/glog.git', :tag => 'v0.3.5'
  pod 'Folly', :git => 'https://github.com/facebook/folly.git', :tag => 'v2018.10.22.00'

  # Post-install script to fix build issues
  post_install do |installer|
    react_native_post_install(
      installer,
      :mac_catalyst_enabled => false
    )
    __apply_Xcode_12_5_M1_post_install_workaround(installer)
    
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Exclude arm64 architecture for Simulator
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
        
        # Set minimum deployment target to avoid warnings
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '11.0'
      end
    end
  end
end