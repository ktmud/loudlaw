var keynameMap = {
  'cate': {
    '01': '宪法',
    '02': '刑法',
    '03': '民法',
    '04': '行政法',
    '05': '环境法',
    '06': '劳动教养',
    '07': '烟草法',
    '08': '信息化',
    '09': '经济法',
    '12': '劳动法',
    '16': '知识产权',
    '17': '财务税收',
    '18': '交通安全',
    '19': '房地产及建筑',
    '20': '公务员',
    '21': '个人所得税',
    '22': '诉讼程序',
    '24': '工商行政',
    '27': '反腐倡廉'
  },
  'type': {
    'law': '法律',
    'itpt': '司法解释'
  }
};

function random_tags(limit, fn) {
  central.datasets.tags.bulk({
    for: 'library',
    random: true,
    limit: limit
  }, fn);
}

module.exports = function(central, app, dataset) {
  this.keynameMap = keynameMap;

  app.get('/', function(req, res, next) {
    res.ll_write('library/index', {
      pipefy: true,
      statusCode: 200,
      types: keynameMap['type'],
      cates: keynameMap['cate']
    });
    next();
  }, function(req, res, next) {
    var counter = 5;
    function countDown() {
      counter--;
      if (counter <= 0) next();
    };

    random_tags(20, function(err, tags) {
      res.ll_write('library/index/mods/tags', {
        pagelet: {
          id: 'mod-tags'
        },
        data: tags || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'law', 'hits', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-hot-law'
        },
        hd: '热门法律',
        data: docs && docs.list || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'law', 'default', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-latest-law'
        },
        hd: '最新法律',
        data: docs && docs.list || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'itpt', 'hits', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-hot-itpt'
        },
        hd: '热门司法解释',
        data: docs && docs.list || []
      });
      countDown();
    });
    dataset.fetch(['list', 'type', 'itpt', 'default', 1, 5], function(err, docs) {
      res.ll_write('library/index/mods/docs', {
        pagelet: {
          id: 'mod-latest-itpt'
        },
        hd: '最新司法解释',
        data: (docs && docs.list) || []
      });
      countDown();
    });
  }, central.reqbase.close());
};
