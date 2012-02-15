# [大声看法](www.dakanfa.com) 网站源码

『大声看法』希望能成为与互联网关系最亲切的法律类网站。

要做的东西简直太多，我一个人实在搞不定了……

现在把这些混乱的源码贡献出来，有兴趣的朋友可以拿过去改个博客或者 CMS 。虽然可能代码有点丑，但是主要功能还是有的嘛....

不过当然最主要的目的还是希望能有人参与进来，和我一起完成这项伟大的公益事业...

## 技术实现····

node.js + express + couchdb + couchdb-lucene + nginx proxy + seajs + less

有没有很 fashion !

做了很麻烦的缓存，还搞了下 BigPipe ，一切都为了打开速度更快！

## 开始开发···· 

下载源码后，直接 `npm install -d && npm start` 即可。

默认连接的是 http://law.ic.ht 这个数据库，你当然也可以搞一个本地的镜像，然后用 couchdb 的 `_replicator` 复制一份过去。

## 联系····

想要参与本项目的同学请联系 [man#dakanfa.com](mailto:man@dakanfa.com) 。当然，你悄悄 fork 也没人拦着你。
