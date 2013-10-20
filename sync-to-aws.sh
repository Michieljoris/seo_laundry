rsync --verbose  --progress --stats --compress --rsh=/usr/bin/ssh --recursive --times --perms --links --delete --exclude "*bak" --exclude "*~" --exclude ".git" ~/www/firstdoor/ ubuntu@aws:~/www/firstdoor/










