// @ts-check
const assert = require('chai').assert;
const sinon = require('sinon');

const config = require('../../lib/config');
const {
  allowAccess,
  validateSubdomainRequest,
  assertSubdomainOrRedirect,
} = require('../../middlewares/subdomain');

describe('subdomain middleware', () => {
  describe('allowAccess', () => {
    it('allows access to question page from subdomain', () => {
      assert.isTrue(
        allowAccess(
          'q1.prairielearn.com',
          'http://q1.prairielearn.com',
          '/pl/course/1/question/1/preview'
        )
      );
    });

    it('denies access to question page on different subdomain', () => {
      assert.isFalse(
        allowAccess(
          'q2.prairielearn.com',
          'http://q1.prairielearn.com',
          '/pl/course/1/question/1/preview'
        )
      );
    });

    it('denies access to main domain from subdomain', () => {
      assert.isFalse(allowAccess('prairielearn.com', 'http://q1.prairielearn.com', '/pl/'));
    });

    it('allows access to global static asset routes from subdomain', () => {
      assert.isTrue(
        allowAccess(
          'prairielearn.com',
          'http://q1.prairielearn.com',
          '/cacheable_node_modules/abcd1234/foo/bar.js'
        )
      );

      assert.isTrue(
        allowAccess('prairielearn.com', 'http://q1.prairielearn.com', '/assets/abcd1234/bar.js')
      );
    });

    it('allows access to selected subdomain routes if Origin header not present', () => {
      assert.isTrue(allowAccess('q1.prairielearn.com', null, '/pl/course/1/question/1/preview'));
    });

    it('denies access to selected subdomain routes if Origin header not present', () => {
      assert.isFalse(allowAccess('q1.prairielearn.com', null, '/pl/course/1/admin'));
    });

    it('allows all requests to canonical host if Origin header missing', () => {
      assert.isTrue(allowAccess('prairielearn.com', null, '/pl/course/1/question/1/preview'));
    });

    it('allows requests that do not involve subdomains', () => {
      assert.isTrue(
        allowAccess('prairielearn.com', 'https://prairielearn.com', '/pl/course/1/admin')
      );
    });

    it('does not allow requests to unknown subdomains', () => {
      assert.isFalse(
        allowAccess('foobar.prairielearn.com', 'https://prairielearn.com', '/pl/course/1/admin')
      );
    });

    it('does not allow requests from unknown subdomains', () => {
      assert.isFalse(
        allowAccess('prairielearn.com', 'https://foobar.prairielearn.com', '/pl/course/1/admin')
      );
    });
  });

  /**
   * Constructs a fake Express request object for use in tests.
   *
   * @param {string} hostname
   * @param {string | null | undefined} origin
   * @param {string} originalUrl
   */
  function makeFakeRequest(hostname, origin, originalUrl) {
    return /** @type {import('express').Request} */ ({
      get(header) {
        if (header.toLowerCase() === 'origin') {
          return origin;
        }
        return undefined;
      },
      hostname,
      originalUrl,
    });
  }

  /**
   * Constructs a fake Express response object for use in tests.
   */
  function makeFakeResponse() {
    const statusSpy = sinon.stub();
    const sendSpy = sinon.stub();
    const redirectSpy = sinon.stub();
    const res = /** @type {import('express').Response} */ (
      /** @type {unknown} */ ({
        status: statusSpy,
        send: sendSpy,
        redirect: redirectSpy,
      })
    );
    statusSpy.returns(res);
    return {
      res,
      statusSpy,
      sendSpy,
      redirectSpy,
    };
  }

  describe('validateSubdomainRequest middleware', () => {
    it('allows good request', () => {
      const req = makeFakeRequest(
        'q1.prairielearn.com',
        'https://q1.prairielearn.com',
        '/pl/course/1/question/1/preview'
      );
      const { res, statusSpy, sendSpy } = makeFakeResponse();
      const next = sinon.spy();

      validateSubdomainRequest(req, res, next);

      assert.isTrue(next.calledOnce);
      assert.isUndefined(next.args[0][0]);
    });

    it('denies bad request', () => {
      const req = makeFakeRequest(
        'q1.prairielearn.com',
        'https://q1.prairielearn.com',
        '/pl/course/1/admin'
      );
      const { res, statusSpy, sendSpy } = makeFakeResponse();
      const next = sinon.spy();

      validateSubdomainRequest(req, res, next);

      assert.isTrue(next.calledOnce);
      const args = next.args[0];
      assert.lengthOf(args, 1);
      assert.instanceOf(args[0], Error);
      assert.equal(args[0].status, 403);
    });
  });

  describe('assertSubdomainOrRedirect middleware', () => {
    let originalServerCanonicalHost = config.serverCanonicalHost;

    before(() => {
      config.serverCanonicalHost = 'https://us.prairielearn.com';
    });

    after(() => {
      config.serverCanonicalHost = originalServerCanonicalHost;
    });

    it('redirects to expected domain', () => {
      const middleware = assertSubdomainOrRedirect(() => 'q321');

      const req = makeFakeRequest('us.prairielearn.com', null, '/pl/course/1/question/321/preview');
      const { res, redirectSpy } = makeFakeResponse();
      const next = sinon.spy();

      middleware(req, res, next);

      assert.isTrue(
        redirectSpy.calledWith('https://q321.us.prairielearn.com/pl/course/1/question/321/preview')
      );
      assert.isFalse(next.called);
    });

    it('proceeds if subdomain is already correct', () => {
      const middleware = assertSubdomainOrRedirect(() => 'q321');

      const req = makeFakeRequest(
        'q321.us.prairielearn.com',
        null,
        '/pl/course/1/question/321/preview'
      );
      const { res, redirectSpy } = makeFakeResponse();
      const next = sinon.spy();

      middleware(req, res, next);

      assert.isFalse(redirectSpy.called);
      assert.isTrue(next.calledOnce);
    });
  });
});