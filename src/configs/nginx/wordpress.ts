export default `## nginx configuration generated by libtoserve

server {
  listen  80;
  server_name {{hostName}};

  root "{{location}}";

  index index.php;

  location = /favicon.ico {
    log_not_found off;
    access_log off;
  }

  location = /robots.txt {
    allow all;
    log_not_found off;
    access_log off;
  }

  location / {
    try_files $uri $uri/ /index.php?$args;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires max;
    log_not_found off;
  }

  location ~ \.php$ {
    include fastcgi_params;
    fastcgi_pass  127.0.0.1:9000;
    fastcgi_read_timeout 2400;
    fastcgi_param PATH_INFO       $fastcgi_path_info;
    fastcgi_param PATH_TRANSLATED $document_root$fastcgi_path_info;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_buffers 16 16k;
    fastcgi_buffer_size 32k;
    fastcgi_index index.php;
  }
}`