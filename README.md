# CRM 2016 - Offline app

### To build:

1. Clone repo and checkout to proper branch
2. Make sure that you have node & npm, gulp, plugman and bower installed (via npm).
3. Set environment variable JDK_HOME=path_to_java_jdk
4. Set environment variable ANDROID_HOME=path_to_android_sdk
5. Download file upload plugin from https://www.dropbox.com/s/5osdtgi76vg867a/fs-android-cordova-file-upload-master.zip?dl=0 and unpack it to separate directory
6. In install.sh and package.json update paths to file upload plugin (~/friendly/fs-android-cordova-file-upload and /Users/luke/Downloads/fs-android-cordova-file-upload-master)
7. Chmod +x install.sh
8. Run gulp
9. Run install.sh script
10. You can start the app with ionic run android

### To test:
1. run ionic run android -—livereload / ionic run android

### App release:
Verify android tool paths in ./build.sh file
Run ./build.sh file
