// Landscape only, full screen, and the AdMob app id in the native projects.
// The AdMob ids below are Google's test ids: replace them with your own from admob.google.com before publishing.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const ANDROID_APP_ID = process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const IOS_APP_ID = process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
const here = new URL('./', import.meta.url).pathname, which = process.argv[2] || 'all';
const edit = (f, fn) => { if (!existsSync(f)) return console.log('skip', f); const a = readFileSync(f, 'utf8'), b = fn(a); if (a !== b) writeFileSync(f, b); console.log('patched', f); };
if (which === 'android' || which === 'all') {
  edit(here + 'android/app/src/main/AndroidManifest.xml', s => {
    if (!s.includes('screenOrientation')) s = s.replace('<activity', '<activity\n            android:screenOrientation="sensorLandscape"');
    if (!s.includes('com.google.android.gms.ads.APPLICATION_ID')) s = s.replace('</application>', `    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${ANDROID_APP_ID}"/>\n    </application>`);
    return s; });
  edit(here + 'android/app/src/main/res/values/styles.xml', s => s.includes('windowFullscreen') ? s
    : s.replace(/(<style name="AppTheme.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>'));
}
if (which === 'ios' || which === 'all') {
  edit(here + 'ios/App/App/Info.plist', s => {
    if (s.includes('GADApplicationIdentifier')) return s;
    const add = `	<key>GADApplicationIdentifier</key>
	<string>${IOS_APP_ID}</string>
	<key>SKAdNetworkItems</key>
	<array><dict><key>SKAdNetworkIdentifier</key><string>cstr6suwn9.skadnetwork</string></dict></array>
	<key>UIRequiresFullScreen</key>
	<true/>
	<key>UIStatusBarHidden</key>
	<true/>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<false/>
`;
    s = s.replace(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>[\s\S]*?<\/array>/, '<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>');
    s = s.replace(/<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>[\s\S]*?<\/array>/, '<key>UISupportedInterfaceOrientations~ipad</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>');
    const i = s.lastIndexOf('</dict>'); return s.slice(0, i) + add + s.slice(i); });
}
