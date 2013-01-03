describe('unit/ajax.js', function() {
	var fajax
	  , Response = require('../helpers/Response')
	before(function() {
		global.XMLHttpRequest = require('../helpers/XMLHttpRequest')
		fajax = require('../../src/ajax')
	})
	after(function() {
		delete global.XMLHttpRequest
	})

	describe('When using form option', function() {
		var req
		describe('with a JS object', function() {
			beforeEach(function() {
				req = fajax('/abc', {
					form: { a: 1, b: [ 1, 2, 3 ], c: 'a=b&c;' }
				})
			})
			it('should format in a simplistic way', function() {
				expect(req.request.send)
					.to.have.been.calledWith('a=1&c=a%3Db%26c%3B')
			})
			it('should set header correctly', function() {
				expect(req.request.setRequestHeader)
					.to.have.been.calledWith('Content-Type', 'application/x-www-form-urlencoded')
			})
		})
		describe('with a string', function() {
			beforeEach(function() {
				req = fajax('/abc', {
					form: 'a=1&b=2'
				})
			})
			it('should send as-is', function() {
				expect(req.request.send)
					.to.have.been.calledWith('a=1&b=2')
			})
			it('should set header correctly', function() {
				expect(req.request.setRequestHeader)
					.to.have.been.calledWith('Content-Type', 'application/x-www-form-urlencoded')
			})
		})
		describe('and qs is defined in global-scope', function() {
			var req
			  , fakeQs
			beforeEach(function() {
				fakeQs = sinon.fake()
				fakeQs.returns('magic')
				fajax.qs(fakeQs)
				req = fajax('/abc', {
					form: { a: 1 }
				})
				fajax.reset()
			})
			it('should use that instead', function() {
				expect(fakeQs).to.have.been.calledWith({ a: 1 })
				expect(req.request.send)
					.to.have.been.calledWith('magic')
			})
		})
	})

	describe('When supplying json option', function() {
		var req
		beforeEach(function() {
			req = fajax('/abc', {
				json: { a: 1, b: [ 1, 2, 3 ] }
			})
		})
		it('should send it encoded', function() {
			expect(req.request.send)
				.to.have.been.calledWith('{"a":1,"b":[1,2,3]}')
		})
		it('should set content-type to application/json', function() {
			expect(req.request.setRequestHeader)
				.to.have.been.calledWith('Content-Type', 'application/json')
		})
		it('should override content-type to match application/json', function() {
			req = fajax(
			  '/abc'
			, { headers: { 'content-type': 'text/plain' }
			  , json: { a: 1, b: [ 1, 2, 3 ] }
			  }
			)
			expect(req.request.setRequestHeader)
				.to.have.been.calledWith('Content-Type', 'application/json')
		})
	})

	describe('When supplying body', function() {
		var req
		beforeEach(function() {
			req = fajax('/abc', {
				body: 'def'
			})
		})
		it('should send as-is', function() {
			expect(req.request.send)
				.to.have.been.calledWith('def')
		})
		it('should use default content-type of text/plain', function() {
			expect(req.request.setRequestHeader)
				.to.have.been.calledWith('Content-Type', 'text/plain; charset=utf-8')
		})
		it('should not override explicit content-type', function() {
			req = fajax(
			  '/abc'
			, { headers: { 'content-type': 'application/json' }
			  , body: '{"a":1}'
			  }
			)
			expect(req.request.setRequestHeader)
				.to.have.been.calledWith('Content-Type', 'application/json')
		})
	})

	describe('When changing options', function() {
		it('should allow overriding defaults', function() {
			fajax.defaults({ method: 'abc' })
			var req = fajax('any url').request
			expect(req.open).to.have.been.calledWith('ABC')
			fajax.reset()
		})
		it('should send the new method blindly', function() {
			var prom = fajax({ method: 'abc', url: 'a' })
			  , req = prom.request
			expect(req.open).to.have.been.calledWith('ABC')
		})
		it('should support setting headers', function() {
			var req = fajax({ headers: { accept: 'abc/def', 'ghi-jkl': 'mno' } }).request
			expect(req.setRequestHeader)
				.to.have.been.calledWith('Accept', 'abc/def')
				.and.to.have.been.calledWith('Ghi-Jkl', 'mno')
		})
		it('should not allow overriding the default `accept` ', function() {
			fajax.defaults({ accept: 'abc' })
			var req = fajax({ headers: { accept: 'def' } }).request
			expect(req.setRequestHeader)
				.to.have.been.calledWith('Accept', 'def')
				.and.not.to.have.been.calledWith('Accept', 'abc')
		})
	})

	describe('When response is type json', function() {
		var body
		before(function() {
			var prom = fajax('a', function(res) { body = res.body })
			  , request = prom.request
			request._load(new Response(
			{ headers: { 'Content-type': 'application/json' }
			, body: { a: 1, b: 2 }
			}))
		})
		it('should automatically parse it', function() {
			expect(body).to.deep.equal({ a: 1, b: 2 })
		})
		it('should parse properly when charset is also given', function() {
			var prom = fajax('a', function(res) { body = res.body })
			  , request = prom.request
			request._load(new Response(
			{ headers: { 'Content-type': 'application/json; charset=utf-8' }
			, body: { a: 1, b: 2 }
			}))
			expect(body).to.deep.equal({ a: 1, b: 2 })
		})
	})

	describe('When calling `fajax(opts)`', function() {
		var instance
		  , callback
		before(function() {
			XMLHttpRequest._reset()
			callback = sinon.fake()

			var opts =
			    { onload: callback
			    , url: 'abc'
			    }
			instance = fajax(opts).request
		})
		it('should properly assign the url and onload options', function() {
			expect(instance.open).to.have.been.calledWith('GET', 'abc')
		})
	})

	describe('When calling with `fajax(url, callback)`', function() {
		var instance
		  , callback
		before(function() {
			XMLHttpRequest._reset()
			callback = sinon.fake()
			fajax('abc', callback)
			instance = XMLHttpRequest._instances[0]
		})
		it('should create a new XMLHttpRequest', function() {
			expect(XMLHttpRequest._instances).to.have.property('length', 1)
		})
		it('should execute open on the XMLHttpRequest', function() {
			expect(instance.open)
				.to.have.been.calledWith('GET', 'abc', true, null, null)
		})
		it('should execute send on the XMLHttpRequest', function() {
			expect(instance.send)
				.to.have.been.called
		})
		it('should listen to the proper events', function() {
			expect(instance.addEventListener)
				.to.have.been.calledWith('load')
		})
		describe('and data is loaded', function() {
			it('should call the callback', function() {
				var fakeEvent = new Response()
				instance._load(fakeEvent)
				expect(callback).to.have.been.calledWith(fakeEvent)
			})
		})
	})
})
