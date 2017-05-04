currentVersion=$(cat config.xml | grep -e '[0-9]\.[0-9][0-9]\?\.[0-9][0-9]\?' --color -o | head -1);
read -r -p "Setting version on API server to "$currentVersion". PLEASE UPLOAD APP FIRST, and wait for approval. Is it done yet? [y/N] " response
if [[ $response =~ ^([yY][eE][sS]|[yY])$ ]]
then
    echo "Setting current version number stored on API to "$currentVersion;
    curl -H "Content-Type: application/json" -X POST -d '{"token":"BK3ql68X3lYtLvk6I4D8XlTPjmgs4S4h","version":"'$currentVersion'"}' http://api.friendlycmms.com/app?tag=tcg;
    echo "";
else
    echo "Version not updated on api server."
fi
