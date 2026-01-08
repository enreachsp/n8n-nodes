FROM n8nio/n8n:1.123.10

RUN mkdir -p /home/node/n8n-custom/EnreachNode
COPY ./dist /home/node/n8n-custom/EnreachNode/dist