/**
 * Authentication Controller
 */
module.exports = {

  /**
   * Log out a user and return them to the homepage
   *
   * Passport exposes a logout() function on req (also aliased as logOut()) that
   * can be called from any route handler which needs to terminate a login
   * session. Invoking logout() will remove the req.user property and clear the
   * login session (if any).
   *
   * For more information on logging out users in Passport.js, check out:
   * http://passportjs.org/guide/logout/
   *
   * @param {Object} req
   * @param {Object} res
   */
  logout: function (req, res) {
    // As the logout action has a side-effect, clients shouldn't be able to
    // invoke it with a GET method. A good example of a bug caused by a lack
    // of such check were initially unexplained logouts caused by browser
    // preloads. In a lot of browsers just typing an endpoint address in an
    // address bar will cause a logout due to preloading request sent to logout
    // endpoint.
    if (req.method.toUpperCase() != 'POST') {
      res.send(400);
      return;
    }
    req.logout();
    delete req.user;
    delete req.session.passport;
    req.session.authenticated = false;

    if (!req.isSocket) {
      res.redirect(req.query.next || '/');
    }
    else {
      res.ok();
    }
  },

  /**
   * Create a third-party authentication endpoint
   *
   * @param {Object} req
   * @param {Object} res
   */
  provider: function (req, res) {
    sails.services.passport.endpoint(req, res);
  },

  /**
   * Create a authentication callback endpoint
   *
   * This endpoint handles everything related to creating and verifying Pass-
   * ports and users, both locally and from third-aprty providers.
   *
   * Passport exposes a login() function on req (also aliased as logIn()) that
   * can be used to establish a login session. When the login operation
   * completes, user will be assigned to req.user.
   *
   * For more information on logging in users in Passport.js, check out:
   * http://passportjs.org/guide/login/
   *
   * @param {Object} req
   * @param {Object} res
   */
  callback: function (req, res) {
    var action = req.param('action');

    function negotiateError (err) {
      if (action === 'register') {
        res.redirect('/register');
      }
      else if (action === 'login') {
        res.redirect('/login');
      }
      else if (action === 'disconnect') {
        res.redirect('back');
      }
      else {
        // make sure the server always returns a response to the client
        // i.e passport-local bad username/email or password
        res.send(403, err);
      }
    }

    sails.services.passport.callback(req, res, function (err, user, info, status) {
      if (err || !user) {
        sails.log.warn(user, err, info, status);
		  if(!err && info) {
			  return negotiateError(info);
		  }
        return negotiateError(err);
      }

      req.login(user, function (err) {
        if (err) {
          sails.log.warn(err);
          return negotiateError(err);
        }

        req.session.authenticated = true;

        // Upon successful login, optionally redirect the user if there is a
        // `next` query param
        if (req.query.next) {
          var url = sails.services.authservice.buildCallbackNextUrl(req);
          res.status(302).set('Location', url);
        }

        sails.log.info('user', user, 'authenticated successfully');
        return res.json(user);
      });
    });
  },

  /**
   * Disconnect a passport from a user
   *
   * @param {Object} req
   * @param {Object} res
   */
  disconnect: function (req, res) {
    sails.services.passport.disconnect(req, res);
  }
};
