cmake_minimum_required(VERSION 3.13)
project(tribubaby)

# 16KB page size support (required by Google Play)
add_link_options("-Wl,-z,max-page-size=16384")

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)
