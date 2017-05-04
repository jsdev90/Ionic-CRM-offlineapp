dateNow=$(date +%Y-%m-%d-%H_%M);
currentVersion=$(cat config.xml | grep -e '[0-9]\.[0-9][0-9]\?\.[0-9][0-9]\?' --color -o | head -1);
packageName=$(cat config.xml | grep -e 'com.friendlysol.crm\.[a-z0-9]\{1,\}' --color -o | head -1);
armFilename="$packageName-$currentVersion.apk";
echo "Build $currentVersion, $dateNow...";
echo "Run gulp tasks...";
gulp minify-scripts;
gulp sass;
ionic build android --release;
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -storepass chicago  -keystore crm.keystore platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk crm;
~/Library/Android/sdk/build-tools/23.0.0/zipalign -v 4 platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk $armFilename;
echo "Removing old apks...";
rm build/*.apk
echo "Copying apks to build directory";
mv *.apk build/;

cp changelog_template.html build/;
mv build/changelog_template.html build/index.html;

sed -i '.bak' "s/version_number/$currentVersion/g" build/index.html;
sed -i '.bak' "s/arm_filename_uri/$armFilename/g" build/index.html;
