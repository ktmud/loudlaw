var user_updates = {
  touch: function(doc, req) {
    var arg;
    // check where to get the data
    if (req.form.uid) {
      arg = req.form;
    } else {
      arg = req.query;
    }

    if (doc) {
      // update last access time
      doc.atime = new Date();
      if (arg.ip) doc.aip = arg.ip;
      return [doc, {
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(doc)
      }];
    }

    // default scheme
    doc = {
      _id: arg.uid,
      email: arg.email,
      // screen name
      uname: arg.uname,
      // password
      hash: arg.hash,
      // admin role
      roles: arg.roles || [],
      email_verified: false
    };
    // create time of this account
    doc.ctime = doc.atime = new Date();
    // remote ip
    doc.cip = doc.aip = arg.ip;
    return [doc, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(doc)
    }];
  },
  inplace: function(doc, req) {
    if (req.form.email) {
      var arg = req.form;
    } else {
      var arg = req.query;
    }

    if (doc) {
      // update last access time
      doc.atime = Date.now();
      doc.hash = arg.hash;
      doc.aip = arg.ip;
      return [doc, doc];
    }
    return [null, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'missing', reason: 'user not found' })
    }];
  }
};

var user_views = {
  email: {
    map: function(doc) {
      if (doc.email) {
        emit(doc.email, doc);
      }
    }
  },
  verified: {
    map: function(doc) {
      emit(!!doc.email_verified, doc);
    }
  }
};

module.exports = {
  user: {
    views: user_views,
    updates: user_updates
  }
};
