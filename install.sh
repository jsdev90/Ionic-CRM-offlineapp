ionic platform remove android --save;
rm -rf platforms;
rm -rf plugins;
rm -rf fs-android-cordova-file-upload;
ionic platform add android@5.0.0 --save;
#removing conflicting file, it gets installed in further steps
rm -f platforms/android/src/org/apache/cordova/PermissionHelper.java;
plugman install --platform android --project platforms/android --plugin https://github.com/phonegap-build/PushPlugin.git;
plugman install --platform android --project platforms/android --plugin cordova-plugin-camera;
plugman install --platform android --project platforms/android --plugin cordova-plugin-inappbrowser;
plugman install --platform android --project platforms/android --plugin uk.co.workingedge.phonegap.plugin.launchnavigator;
npm install;
bower install;
yes | git clone https://github.com/friedlysol/fs-android-cordova-file-upload;
cd fs-android-cordova-file-upload;
/bin/bash gather_deps.sh;
cd cordova-plugin;
mkdir src;
cd src;
mkdir android;
cd android;
mkdir res;
cd ..;
cd ..;
cd ..;
/bin/bash build_plugin.sh;
cd ..;
packageName=$(cat config.xml | grep -e 'com.friendlysol.crm\.[a-z0-9]\{1,\}' --color -o | head -1);
ionic plugin add fs-android-cordova-file-upload/cordova-plugin;
sed '/defaultConfig /a \
applicationId "'$packageName'"
' platforms/android/build.gradle > platforms/android/build2.gradle;
mv platforms/android/build.gradle platforms/android/build.gradle.old;
mv platforms/android/build2.gradle platforms/android/build.gradle;
rm -rf fs-android-cordova-file-upload;
gulp minify-scripts;
gulp sass;
echo 'Project ready';
