export PS4='${BASH_SOURCE}:{LINENO}: '

mkdir -p /srv/nodejs/logs
logfile="/srv/logs/nodejs/ll.log"

siteroot=/srv/nodejs/loudlaw
old_rev=$1
new_rev=$2
echo "old revision $1"
echo "new revision $2"

cd $siteroot

export NODE_ENV="vps"

function start() {

    npm install -d

    if [[ -z $1 ]]; then
        echo '*** NOT running, trying to start ***'
    else
        echo "*** RUNNING at pid $1, trying to restart ***"
        killall -2 node
        npm_id=`/usr/bin/pgrep npm`
        if [[ -n $npm_id ]]; then
          killall -2 npm
        fi
    fi

    if [[ -z $old_rev ]]; then
      old_rev='prev'
    fi
      
    if [[ -f $logfile ]]; then
      mv $logfile $logfile\_$old_rev.log
    fi

    npm start > $logfile 2>&1 > $logfile &

    echo "running at `/usr/bin/pgrep node`"
    echo `cat $logfile`
}

start `/usr/bin/pgrep node`
