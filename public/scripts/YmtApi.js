/* global wx: true */

/**
 * YmtApi
 *
 * @description
 * 		这个脚本包含不同端的不同处理，方法名称参数类型基本保持一致，
 * 		在特定场景不存在的方法也由空方法替代，不需要做过多的判断
 *
 * @example
 *   工具方法：
 *   	判断环境
 *   		YmtApi.isWechat
 *   		YmtApi.isSaohuoApp
 *   		YmtApi.isYmtApp
 *
 * 		YmtApi.utils
 * 			getAuthInfo    获得认证信息
 * 			getOrderSource 获得订单来源
 * 			addAuth        添加认证信息 url传递
 *
 *    				         码头app             扫货app            微信
 * 	open 打开页面      			Y                    Y                 Y
 * 	openShare 打开分享       	Y                    Y                 Y
 * 	openChatList 会话列表       Y                    N                 N
 * 	previewImage 会话详情       Y                    Y                 N
 * 	openPay 打开支付      		Y                    Y                 Y
 * 	toLogin 打开登录     		Y                    Y                 Y
 * 	openConfirmOrder  一键购买  N 					 Y                 Y
 *
 *  事件：
 *  	这里是自定义事件，自己sendEvent为单页触发，而由webview sendEvent为
 *  全局触发，默认添加 userStatusChange 登录变更之后会触发，你可以可以自定义
 *  自己的登录会触发回调
 *
 *  	YmtApi.on('userStatusChange',function(){
 *  		//Handling
 *  	});
 *
 * 		YmtApi.off('userStatusChange');//移除指定事件
 * 		YmtApi.off('userStatusChange userStatusChange1 userStatusChange2');//移除指定多个事件
 *
 * 		YmtApi.one('userStatusChange',function(){
 *
 * 		});//执行一次
 *
 * 	微信YmtApi做了相应调整
 *  1、微信初始化不再自动执行，请使用相关功能单独 initWechat
 *  	两个参数：
 *  		options 【 微信初始化参数 】
 *  			参考http://mp.weixin.qq.com/wiki/7/aaa137b55fb2e0456bf8dd9148dd613f.html#.E6.AD.A5.E9.AA.A4.E4.B8.80.EF.BC.9A.E7.BB.91.E5.AE.9A.E5.9F.9F.E5.90.8D
 *  		wxReadyCallback  【微信初始化完毕回调方法】
 *  	 另外方便部分页面和功能不需要自定义，直接使用默认配置，那在调用ymtapi.js 增加wxAutoInit=1参数
 *  	 则自动会执行默认执行initWechat方法
 *    <script src="http://staticmatouapp.ymatou.com/js/ymtApi.js?wxAutoInit=1"> 【自动会执行initWechat使用默认参数】
 *
 *  2、所有页面将放开分享功能，如需关闭自己调用。【默认分享功能，允许分享当前页，切会移除token等信息分享当前页】
 *  	initWechat({/*options* /},function(wx){
 *  		wx.hideMenuItems(/* 关闭的自定义菜单列表* /);
 *  	});
 *
 *  3、toLogin
 *  	支持回调url
 *
 *
 */

+(function (window, undefined) {
	'use strict';

	if (window.ymtApi) {
		return;
	}

	var ymtApi = window.YmtApi = {
		version: '0.1.1'
	};

	var toString = function (obj) {
		return ({}).toString.call(obj);
	};

	function isType(type) {
		return function (obj) {
			return toString(obj) === '[object ' + type + ']';
		};
	}

	var isObject = isType('Object'),
		isString = isType('String'),
		isArray = Array.isArray || isType('Array'),
		isFunction = isType('Function'),
		isUndefined = isType('Undefined');

	var ua = window.navigator.userAgent;
	ymtApi.isWechat = /MicroMessenger/i.test(ua);
	ymtApi.isSaohuoApp = /saohuoApp/i.test(ua);
	ymtApi.isYmtApp = /ymtapp/i.test(ua);
	ymtApi.isIphone = /iPhone/ig.test(ua);
	ymtApi.isAndroid = /Android|Linux/.test(ua);
	ymtApi.isIos = /\(i[^;]+;( U;)? CPU.+Mac OS X/ig.test(ua);

	/**
	 * Event
	 */
	var callbacks = {},
		_id = 0, //函数编号
		_fns = {},
		getFnId = function (fn) {
			var fnStr = toString(fn);
			for (var i in _fns) {
				if (fnStr === _fns[i]) {
					return i;
				}
			}
			return undefined;
		}; //
	/**
	 * 绑定事件
	 * @params
	 * 	 {string} events 事件名称 支持多个使用空格分割
	 * 	 {function} fn   回调函数 不建议使用匿名函数，否则
	 * 	 	off删除指定方法无效，在off使用是，做简单toString转换
	 * 	 	匹配回调函数库
	 */
	ymtApi.on = function (events, fn) {
		if (isFunction(events)) {
			if (isUndefined(fn._id)) {
				fn._id = _id++;
				//保存一份所有方法的回调的备份，已实现匿名方法解绑
				_fns[_id] = toString(fn);
			}
		}
		events.replace(/\S+/g, function (name, pos) {
			(callbacks[name] || (callbacks[name] = [])).push(fn);
			fn.typed = pos > 0;
		});

		return ymtApi;
	};

	ymtApi.off = function (events, fn) {
		if (events === '*') {
			callbacks = {};
		}
		else {
			events.replace(/\S+/g, function (name) {
				if (fn) {
					var arr = callbacks[name];
					for (var i = 0, cb;
						(cb = arr && arr[i]); ++i) {
						//如果解绑为匿名函数（即无fnId的函数）从绑定库中匹配
						//是否能找到绑定相关函数
						if (isUndefined(fn._id)) {
							fn._id = getFnId(fn);
						}
						if (cb._id === fn._id) {
							arr.splice(i--, 1);
						}
					}
				}
				else {
					callbacks[name] = [];
				}
			});
		}
		return ymtApi;
	};

	ymtApi.one = function (eventName, fn) {
		function _on() {
			ymtApi.off(eventName, _on);
			fn.apply(ymtApi, arguments);
		}
		return ymtApi.on(eventName, _on);
	};

	/**
	 * 触发事件
	 */
	ymtApi.sendEvent = function (eventName, data) {
		var args = [].slice.call(arguments, 1),
			fns = callbacks[eventName] || [];

		if (isString(data)) {
			data = JSON.parse(data);
		}

		for (var i = 0, fn;
			(fn = fns[i]); ++i) {
			if (!fn.busy) {
				fn.busy = 1;
				//fn.apply(ymtApi, fn.typed ? [eventName].concat(args) : args)
				fn.apply(ymtApi, [data]);
				if (fns[i] !== fn) {
					i--;
				}
				fn.busy = 0;
			}
		}

		if (callbacks.all && eventName !== 'all') {
			ymtApi.sendEvent.apply(ymtApi, ['all', eventName].concat(args));
		}

		return ymtApi;
	};

	//添加认证监听
	ymtApi.on('userStatusChange', function (ret) {
		ymtApi.auth = {
			AccessToken: ret.AccessToken,
			UserId: ret.UserId
		};
	});

	/**
	 * Utils
	 */
	var utils = ymtApi.utils = {
		/**
		 * 获得token信息，没有则从cookie获得
		 * @return {Object} [description]
		 */
		getAuthInfo: function () {
			var currSearch = ymtApi.auth || utils.getUrlObj();

			//从cookie中获得
			var getTokenFormCookie = function () {
				var tokenMatch = document.cookie.match(/AccessToken=([^;]*)/);
				if (tokenMatch) {
					return tokenMatch[1];
				}
				return undefined;
			};

			if (ymtApi.isYmtApp && (!currSearch.AccessToken || currSearch.AccessToken === 'nil')) {
				currSearch.AccessToken = getTokenFormCookie();
			}

			//判断除掉nil的值
			if (currSearch.AccessToken === 'nil') {
				currSearch.AccessToken = undefined;
			}

			return currSearch;
		},
		/**
		 * 获得订单来源
		 * @return {string} 订单来源
		 */
		getOrderSource: function () {
			var urlObj = utils.getUrlObj(),
				otherSource = urlObj['shareSource'], //是否有来源
				orderSource = '';
			if (ymtApi.isYmtApp) {
				orderSource = 'APP';
			}
			else if (ymtApi.isSaohuoApp) {
				orderSource = 'C2CAPP';
			}
			else if (ymtApi.isWechat) {
				orderSource = 'Wechat';
				if (/saohuoApp/i.test(otherSource)) {
					orderSource = 'C2C' + orderSource;
				}
			}
			else { //如果都不符合 默认算作WAP
				orderSource = 'WAP';
			}
			return orderSource;
		},

		/**
		 * 增加用户认证
		 * @param {string}  url     需要增加的的地址
		 * @param {Boolean} isForce 是否为强制认证，默认值：false；当为true
		 *                          	则会判断是否能得到用户认证，不能则触发登录。
		 */
		addAuth: function (url, isForce) {
			var authInfo = ymtApi.utils.getAuthInfo(),
				currSearch = utils.getUrlObj();

			if (isForce) {
				if (!authInfo || !authInfo.AccessToken || authInfo.AccessToken === 'nil') {
					return ymtApi.toLogin();
				}
			}

			return utils.addParam(url, {
				UserId: authInfo.UserId,
				AccessToken: authInfo.AccessToken,
				shareSource: currSearch.shareSource
			});
		},
		/**
		 * 移除认证
		 */
		rmAuth: function (url) {
			return (url + '').replace(/[&,\?]AccessToken=[^&#]*/ig, '').replace(/[&,\?]UserId=[^&#]*/ig, '');
		},
        /**
         * 解析url
         * @param  {String}  str      需要解析的URL
         * @param  {Boolean} isDecode 是否需要解码
         * @param {boolean} [isNoCaseSensitive] 是否不区分大小写 default:false 默认是区分的
         *                                      如果值为true，则会全部转成小写
         * @return {String}
         */
		parseUrl: function (str,isDecode,isNoCaseSensitive) {
			var arr,
				part,
				url = {};
			if (!(str || '').replace(/^\s+|\s+$/, '')) {
				return {};
			}

			if(isNoCaseSensitive){
				str = str.toLocaleLowerCase();
			}

			if ((str = str.substring(1))) {
				arr = str.split('&');
				for (var i in arr) {
					part = arr[i].split('=');
					url[part[0]] = (isDecode?decodeURIComponent:function(s){return s})(part[1]);
				}
			}
			return url;
		},
		/**
		 * 获得当前页面的参数
		 * @param {boolean} [isNoCaseSensitive] 是否不区分大小写 default:false 默认是区分的
		 * @return {object} [description]
		 */
		getUrlObj: function (isNoCaseSensitive) {
			return utils.parseUrl(location.search,false,isNoCaseSensitive);
		},
		/**
		 * 将对象url参数化
		 * @param  {object} paramObj 参数对象
		 * @return {string}          url query param
		 */
		param: function (paramObj) {
			var str = [];
			for (var i in paramObj) {
				if(!isUndefined(paramObj[i])){
					str.push(i + '=' + encodeURIComponent(paramObj[i]));
				}
			}
			return str.join('&');
		},
		/**
		 * 增加参数
		 *
		 * @param {string}  url
		 * @param {object}  params
		 * @param {boolean} isAddAuth 是否增加认证
		 */
		addParam: function (url, params, isAddAuth) {
			var SEARCH_REG = /\?([^#]*)/,
				HASH_REG = /#(.*)/;
			url = url || '';
			var search = {},
				searchMatch = url.match(SEARCH_REG),
				searchAttr = [],
				searchStr = '';

			if (searchMatch) {
				search = utils.parseUrl(searchMatch[0]);
			}

            //合并当前search参数
			search = ymtApi.extends(search, params);

			if (isAddAuth) {
				search = ymtApi.extends(search, ymtApi.utils.getAuthInfo());
			}

			searchStr = '?'+utils.param(search);

			//是否存在search
			if (SEARCH_REG.test(url)) {
				url = url.replace(SEARCH_REG, searchStr);
			}
			else {
				//是否存在hash
				if (HASH_REG.test(url)) {
					url = url.replace(HASH_REG, searchStr + '#' + url.match(HASH_REG)[1]);
				}
				else {
					url += searchStr;
				}
			}
			return url;
		},
		/**
		 * 判断是否登录
		 *
		 * @return {Boolean} 是否登录
		 */
		hasLogin: function () {
			var auth = utils.getAuthInfo();
			return !!(auth && auth.AccessToken && auth.AccessToken !== 'nil');
		}

	}

	/**=============loadJs===============***/
	;
	(function (window, undefined) {
		/**
		 * 提供简易的loadjs的方法，
		 * @param  {string}   url      加载的url
		 * @param  {Function} callback 回调函数
		 */
		var loadJs = function (url, callback) {
			var head = document.getElementsByTagName('head')[0],
				script = document.createElement('script');

			script.onload = script.onreadystatechange = script.onerror = function () {
				if (script && script.readyState && /^(?!(?:loaded|complete)$)/.test(script.readyState)) {
					return;
				}

				script.onload = script.onreadystatechange = script.onerror = null;
				script.src = '';
				script.parentNode.removeChild(script);
				script = null;
				callback && callback();
			};

			script.charset = 'utf-8';
			script.src = url;
			head.appendChild(script);
		};

		/**
		 * [jsonp description]
		 * @param  {string} url  [description]
		 * @param  {object[type]} opts [description]
		 */
		ymtApi.jsonp = function (url, opts) {
			var callbackFnName = '_ymtapi_' + Date.now();

			opts = opts || {};

			window[callbackFnName] = function (data) {
				opts.callback && opts.callback(data);
				delete window[callbackFnName];
			};

			loadJs(url + '&callback=' + callbackFnName);
		};

	})(window);

	ymtApi.extends = function (src) {
		var obj, args = arguments;
		for (var i = 1, len = args.length; i < len; ++i) {
			if ((obj = args[i])) {
				for (var key in obj) {
					src[key] = obj[key];
				}
			}
		}
		return src;
	};

	/**====================================matoupp===============================**/
	var emptyFn = function () {};

	var domain = 'http://matouapp.ymatou.com';
	/**
	 * 部分功能只适合不同端防止检测失败执行错误
	 */
	ymtApi.extends(ymtApi, {
		/**
		 * 打开窗口
		 * @type function
		 * @param  {object} options
		 *       url:打开的地址
		 *       isNew:是否新窗口打开
		 *       title:窗口标题
		 *       backType：[0|1] 默认：0 则采用goback网页内部
		 *       			一级级返回到顶部触发关闭,1为直接关闭返回
		 */
		open: function (options) {

			if (!options.url) {
				throw new Error('open: url Can not be empty!!');
			}
			options.isNew = options.isNew || 0;
			//获得原有url中search参数
			var _param = {};

			//是否显示原生分享按钮
			if (options.showShareBtn) {
				_param.shareTitle = encodeURIComponent(options.shareTitle);
				_param.shareUrl = options.shareUrl;
				_param.sharePicUrl = encodeURIComponent(options.sharePicUrl);
				_param.shareTip = encodeURIComponent(options.shareContent);
			}

			if (options.title) {
				_param.title = options.title;
			}
			if (options.backType) {
				_param.backType = options.backType;
			}

			if (options.isNew) {
				_param.needJumpFlag = 1;
			}
			window.location.href = utils.addAuth(utils.addParam(options.url, _param));
		},
		/**
		 * 打开确认订单页
		 * @param 查考open参数
		 */
		openConfirmOrder: function (options) {
			var url = 'http://matouapp.ymatou.com/forYmatouApp/orders?directBuy=1';
			options = options || {};
			if (ymtApi.isSaohuoApp || ymtApi.utils.getUrlObj().shareSource === 'saohuoApp') {
				url = 'http://preorder.app.ymatou.com/index';
			}
			options.url = url;
			//默认新窗口打开
			if (options.isNew === undefined) {
				options.isNew = true;
			}
			ymtApi.open(options);
		},
		/*openShare:emptyFn,
		openChatList:emptyFn,
		openChatDetail:emptyFn,
		previewImage:emptyFn,
		openPay: function (params) {
			var url = '/forYmatouApp/orders/toPay?tid=' + params.trandingIds
			+ (params.isIncludeBonded ? '&useBalance=disable&balanceTip=杭保商品不能使用余额支付' : '');
			// alert(url);
			window.location.href = url;
		},
		toLogin:emptyFn,*/
		shareSource: 'ymtapp',
		/**
		 * 打开分享面板
		 * @type function
		 * @param {object} options
		 *        sharePicUrl   分享图片地址
		 *        shareContent 		分享内容
		 *        shareTitle    分享标题
		 *        shareUrl      分享的链接
		 *
		 */
		openShare: function (options) {
			window.location.href = domain + '/forYmatouApp/share?' + utils.param({
				title: '分享',
				shareTitle: options.shareTitle,
				sharePicUrl: options.sharePicUrl,
				shareTip: options.shareTip || options.shareContent,
				shareUrl: options.shareUrl,
				shareFlag: 1
			});
		},
		/**
		 * 打开聊天列表
		 * @param  {object} options
		 *
		 */
		openChatList: function () {
			window.location.href = domain + '/forYmatouApp/chatList';
		},
		/**
		 * 打开聊天详情
		 * @param  {object} options
		 *         	   SessionId
		 *		       ToId
		 *             ToLoginId
		 *			   ToLogoUrl
		 *
		 */
		openChatDetail: function (options) {
			var param = {
				SessionId: options.SessionId,
				ToId: options.ToId,
				ToLoginId: options.ToLoginId,
				ToLogoUrl: options.ToLogoUrl
			};

			window.location.href = domain + '/forYmatouApp/chatDetail?param=' + JSON.stringify(param);
		},
		/**
		 * 预览图片接口
		 * @param  {object} options
		 *         urls 	{array}  图片地址
		 *         current	{number} 当前图片的索引值，对应urls中的数组坐标
		 *
		 */
		previewImage: function (options) {
			var param = '{"images":' + JSON.stringify(options.urls) + ',"currentInx":' + options.current + '}';
			window.location.href = domain + '/forYmatouApp/imagePreview?param=' + param;
		},
		/**
		 * 打开支付面板
		 *  trandingIds       交易号
		 *  isIncludeBonded   是否包含杭保订单
		 *  orderId          订单号
		 */
		openPay: function (params) {
			var authInfo = ymtApi.utils.getAuthInfo();
			location.href = ymtApi.utils.addParam('http://m.ymatou.com/checkout', {
				tid: params.trandingIds,
				loginaccesstoken: authInfo.AccessToken
			});
			//window.location.href = domain + '/forYmatouApp/orders/toPay?tid=' + params.trandingIds + (params.isIncludeBonded ? '&useBalance=disable&balanceTip=杭保商品不能使用余额支付' : '');
		},
		/**
		 * 去登录
		 *
		 */
		toLogin: function (url) {
			url = url || window.location.href;
			window.location.href = domain + '/forYmatouApp/loginStatus?hasLogin=0&ret=' + encodeURIComponent(url);
		}
	});
	if (ymtApi.isYmtApp) {
		/*
		 * 在码头app中增加完全限定域名http://matouapp.ymatou.com
		 */
		var domain = 'http://matouapp.ymatou.com';

		ymtApi.extends(ymtApi, {
			shareSource: 'ymtapp',
			/**
			 * 打开分享面板
			 * @type function
			 * @param {object} options
			 *        sharePicUrl   分享图片地址
			 *        shareContent 		分享内容
			 *        shareTitle    分享标题
			 *        shareUrl      分享的链接
			 *
			 */
			openShare: function (options) {
				window.location.href = domain + '/forYmatouApp/share?' + utils.param({
					title: '分享',
					shareTitle: options.shareTitle,
					sharePicUrl: options.sharePicUrl,
					shareTip: options.shareTip || options.shareContent,
					shareUrl: utils.addParam(options.shareUrl, {
						shareSource: 'ymtapp'
					}),
					shareFlag: 1
				});
			},
			/**
			 * 打开聊天列表
			 * @param  {object} options
			 *
			 */
			openChatList: function () {
				window.location.href = domain + '/forYmatouApp/chatList';
			},
			/**
			 * 打开聊天详情
			 * @param  {object} options
			 *         	   SessionId
			 *		       ToId
			 *             ToLoginId
			 *			   ToLogoUrl
			 *
			 */
			openChatDetail: function (options) {
				var param = {
					SessionId: options.SessionId,
					ToId: options.ToId,
					ToLoginId: options.ToLoginId,
					toLoginId: options.ToLogoUrl
				};

				window.location.href = domain + '/forYmatouApp/chatDetail?param=' + JSON.stringify(param);
			},
			/**
			 * 预览图片接口
			 * @param  {object} options
			 *         urls 	{array}  图片地址
			 *         current	{number} 当前图片的索引值，对应urls中的数组坐标
			 *
			 */
			previewImage: function (options) {
				var param = '{"images":' + JSON.stringify(options.urls) + ',"currentInx":' + options.current + '}';
				window.location.href = domain + '/forYmatouApp/imagePreview?param=' + param;
			},
			/**
			 * 打开支付面板
			 *  trandingIds       交易号
			 *  isIncludeBonded   是否包含杭保订单
			 *  orderId          订单号
			 */
			openPay: function (params) {
				window.location.href = domain + '/forYmatouApp/orders/toPay?tid=' + params.trandingIds + (params.isIncludeBonded ? '&useBalance=disable&balanceTip=杭保商品不能使用余额支付' : '');
			},
			/**
			 * 去登录
			 *
			 */
			toLogin: function () {
				window.location.href = domain + '/forYmatouApp/loginStatus?hasLogin=0';
			}
		});
	}
	else if (ymtApi.isWechat) {
		if (!(window.wx || window.jWeixin)) {
			window.alert('must load jWeixin!');
		}
		ymtApi.extends(ymtApi, {
			isWechat: true,
			isWechatReady: false,
			isDebug: false,
			/**
			 * 新增微信自动运行方法
			 */
			init: function () {
				var scripts = document.getElementsByTagName('script'),
					current = scripts[scripts.length - 1],
					src = current.src;
				//判断是否是当前节点
				if (/YMTAPI/ig.test(src) && /wxAutoInit/ig.test(src)) {
					ymtApi.initWechat({});
				}

				if (/YMTAPI/ig.test(src) && /isDebug/ig.test(src)) {
					ymtApi.isDebug = true;
				}

			},
			showShareMask: function () {
				var mask = document.getElementById('ymtapiWechatMask');
				if (!mask) {
					mask = document.createElement('div');
					mask.className = 'wechat-mask show';
					mask.id = 'ymtapiWechatMask';
					mask.innerHTML = '<div style="position:fixed;z-index:9999;left:0px;top:0px;width:100%;text-align:' +
						'center;background-color: rgba(20, 20, 20, 0.95);height: 100%;">' +
						' <img width="90%" src="http://staticontent.ymatou.com/ymtapp/wx_share.png" /></div>';

					(document.body || document.documentElement).appendChild(mask);

				}

				mask.onclick = function () {
					this.style.display = 'none';
					window.localStorage.setItem('showShareMask', 'fasle');
				};

				mask.style.display = 'block';
			},
			/**
			 * 打开窗口
			 * @type function
			 * @param  {object} options
			 *       url:打开的地址
			 *       title:窗口标题
			 */
			open: function (options) {

				if (!options.url) {
					throw new Error('open: url Can not be empty!!');
				}
				//获得原有url中search参数
				var _param = {};

				if (options.title) {
					_param.title = options.title;
				}

				if (options.addAuth) {
					_param.addAuth = 1;
				}
				window.location.href = utils.addAuth(utils.addParam(options.url, _param));
			},
			/**
			 * 打开分享面板
			 * @type function
			 * @param {object} options
			 *        sharePicUrl   分享图片地址
			 *        shareTip      分享内容
			 *        shareTitle    分享标题
			 *        shareUrl      分享的链接
			 *        hideMask      隐藏遮罩层
			 */
			openShare: function (options) {
				var shareConf = {};
				options = options || {};

				var urlObj = utils.getUrlObj(),
					otherSource = urlObj['shareSource'];

				shareConf.title = options.shareTitle || '洋码头海外购';
				shareConf.link = utils.addParam(options.shareUrl, {
					shareSource: otherSource
				});
				shareConf.desc = options.shareTip || options.shareContent || '购在全球，我们只做洋货';
				shareConf.imgUrl = options.sharePicUrl || 'http://static.ymatou.com/images/home/zbuy-logo-n.png';
				wx.onMenuShareTimeline(shareConf);
				wx.onMenuShareAppMessage(shareConf);

				!options.hideMask && ymtApi.showShareMask();
			},
			previewImage: function (options) {
				if (window.wxIsReady === true) {
					//微信图片预览
					wx.previewImage({
						current: options.urls[options.current], // 当前显示的图片链接
						urls: options.urls // 需要预览的图片链接列表
					});
				}
			},
			//打开支付面板
			//tid,isIncludeBonded,url
			openPay: function (params) {
				var urlObj = utils.getUrlObj(),
					otherSource = urlObj['shareSource'];

				var url = params.url || 'http://matouapp.ymatou.com/forYmatouApp/orders/successful?tids=' + params.trandingIds;
				var exts = params.exts || {};
				//扫货成功回调页
				if (/saohuoApp/i.test(otherSource)) {
					url = 'http://preorder.app.ymatou.com/success?AccessToken=' + exts.AccessToken;
				}
				url = utils.addAuth(url);
				var str = 'http://wx.ymatou.com/Pay/wechat.html?tradingId=' + params.trandingIds + '&ret=' + encodeURIComponent(url);
				window.location.href = utils.addAuth(str);
			},
			/**
			 * 去登录
			 *
			 */
			toLogin: function (url) {
				url = url || window.location.href;
				window.location.href = 'http://login.ymatou.com/WeChatLogin?ret=' + encodeURIComponent(url);
			},
			/**
			 * 初始化微信
			 */
			initWechat: function (opts, wxReadyCallback) {
				var baseUrl = 'm.ymatou.com',
					u = window.encodeURIComponent(window.location.href.split(/#/)[0]),
					wx = window.wx || {};

				var wxconf = {
					debug: ymtApi.isDebug,
					appId: 'wxa06ebe9f39751792',
					timestamp: null,
					nonceStr: '',
					signature: '',
					shareConf: {
						title: '洋码头海外购',
						desc: '购在全球，我们只做洋货',
						imgUrl: 'http://static.ymatou.com/images/home/zbuy-logo-n.png'
					},
					jsApiList: [
						'checkJsApi',
						'onMenuShareTimeline',
						'onMenuShareAppMessage',
						'onMenuShareQQ',
						'onMenuShareWeibo',
						'hideMenuItems',
						'showMenuItems',
						'hideAllNonBaseMenuItem',
						'showAllNonBaseMenuItem',
						'translateVoice',
						'startRecord',
						'stopRecord',
						'onRecordEnd',
						'playVoice',
						'pauseVoice',
						'stopVoice',
						'uploadVoice',
						'downloadVoice',
						'chooseImage',
						'previewImage',
						'uploadImage',
						'downloadImage',
						'getNetworkType',
						'openLocation',
						'getLocation',
						'hideOptionMenu',
						'showOptionMenu',
						'closeWindow',
						'scanQRCode',
						'chooseWXPay',
						'openProductSpecificView',
						'addCard',
						'chooseCard',
						'openCard'
					],
					menuItemConf: { //
						menuList: [
							'menuItem:exposeArticle',
							'menuItem:setFont',
							'menuItem:dayMode',
							'menuItem:nightMode',
							// 'menuItem:refresh',
							'menuItem:profile',
							'menuItem:addContact',

							/*'menuItem:share:appMessage',
							'menuItem:share:timeline',
							'menuItem:share:qq',
							'menuItem:share:weiboApp',
							'menuItem:favorite',
							'menuItem:share:facebook',*/
							'menuItem:share:QZone',

							'menuItem:editTag',
							'menuItem:delete',
							'menuItem:copyUrl',
							'menuItem:originPage',
							'menuItem:readMode',
							'menuItem:openWithQQBrowser',
							'menuItem:openWithSafari',
							'menuItem:share:email',
							'menuItem:share:brand'
						],
						success: function (res) {
							console.log(res);
						},
						fail: function (res) {
							console.log(res);
							wx.showOptionMenu();
							wx.showAllNonBaseMenuItem();
						}
					}
				};

				opts = ymtApi.extends(wxconf, opts);

				/** 默认分享设置 */
				var defaultShare = function () {
					var conf = opts.shareConf,
						urlObj = utils.getUrlObj();
					//移除认证分享
					conf.link = conf.link || ymtApi.utils.rmAuth(location.href);

					utils.addParam(conf.link, {
						shareSource: urlObj.shareSource
					});

					wx.onMenuShareTimeline(conf);
					wx.onMenuShareAppMessage(conf);
				};

				ymtApi.jsonp('http://' + baseUrl + '/GetJsSignature.aspx?v=' + new Date().getTime() + '&appId=' + wxconf.appId + '&u=' + u, {
					callback: function (res) {
						res = res || {};

						if (!res.Signature || !res.TimeStamp || !res.NonceStr) {
							return;
						}
						wxconf['signature'] = res.Signature;
						wxconf['timestamp'] = res.TimeStamp;
						wxconf['nonceStr'] = res.NonceStr;
						wxconf['appId'] = res.AppId;



						wx.config(opts);

						wx.ready(function () {

							ymtApi.isWechatReady = true;

							wx.hideMenuItems(opts.menuItemConf);
							defaultShare();
							wxReadyCallback && wxReadyCallback(wx);
						});
					}
				});

			}
		});
		ymtApi.init();

	}
	else if (ymtApi.isSaohuoApp) {
		ymtApi.extends(ymtApi, {
			shareSource: 'saohuoApp',
			/**
			 * 打开窗口
			 * @type function
			 * @param  {object} options
			 *       url:打开的地址
			 *       isNew:是否新窗口打开
			 *       title:窗口标题
			 *       showShareBtn: {number} 是否显示分享按钮
			 *       	强制参数：
			 *       		如果showShareBtn = 1
			 *       		则需要传递如下参数
			 *       			shareTitle
			 *       			shareUrl
			 *       			sharePicUrls
			 *       			shareContent
			 *       			showShareBtn 是否显示微博分享按钮 默认隐藏
			 *       backFlag  [0|1] 作为放弃支付的终止页面标记
			 *       	例如：从单页标记当前返回页，当用户终止支付，将支付页到标记页中的所有页面关闭
			 *       		如果存在多个标记页则取最后一个
			 *       backType：[0|1] 默认：0 则采用goback网页内部
			 *       			一级级返回到顶部触发关闭,1为直接关闭返回
			 */
			open: function (options) {

				if (!options.url) {
					throw new Error('open: url Can not be empty!!');
				}
				options.isNew = options.isNew || 0;
				//获得原有url中search参数
				var _param = {};

				if (options.title) {
					_param.title = options.title;
				}
				//是否显示原生分享按钮
				if (options.showShareBtn) {
					_param.ShareTitle = encodeURIComponent(options.shareTitle);
					_param.ShareLinkUrl = encodeURIComponent(utils.addParam(options.shareUrl, {
						shareSource: 'saohuoApp'
					}));
					_param.SharePicUrl = encodeURIComponent(options.sharePicUrl);
					_param.ShareContent = encodeURIComponent(options.shareContent);
					_param.shareFlag = 1;
					_param.showWeiboFlag = +!!options.showWeiboBtn;
				}

				if (options.backType) {
					_param.backType = options.backType;
				}
				if (options.backFlag) {
					_param.backFlag = 1;
				}

				if (options.isNew) {
					_param['forBuyerApp_needJumpFlag'] = 1;
				}

				if (options.showMore) {
					_param.ShowMore = 1;
					_param.BackTitle = options.backTitle; //	需要显示的返回标题
					_param.BackUrl = options.backUrl; //	需要跳转的返回地址
				}

				window.location.href = utils.addAuth(utils.addParam(options.url, _param));
			},
			previewImage: function () {

			},
			/**
			 * 打开分享面板
			 * @type function
			 * @param {object} options
			 *        sharePicUrl   分享图片地址
			 *        shareContent 		分享内容
			 *        shareTitle    分享标题
			 *        shareUrl      分享的链接
			 *        showWeiboBtn  是否显示微博分享按钮 默认隐藏 0
			 *
			 */
			openShare: function (options) {
				window.location.href = '/forYmatouApp/share?' + utils.param({
					title: '分享',
					ShareTitle: options.shareTitle,
					SharePicUrl: options.sharePicUrl,
					ShareContent: options.shareContent || options.shareTip,
					ShareLinkUrl: utils.addParam(options.shareUrl, {
						shareSource: 'saohuoApp'
					}),
					showWeiboFlag: +!!options.showWeiboBtn,
					ShareFlag: 1
				});
			},
			/**
			 * 打开聊天列表
			 * @param  {object} options
			 *
			 */
			openChatList: function () {},
			/**
			 * 打开聊天详情
			 * @param  {object} options
			 *         	   SessionId
			 *		       ToId
			 *             ToLoginId
			 *			   ToLogoUrl
			 *			   exts:{
			 *			   		ProductModel:{
									ProductId {string} 商品编号
									Price: {number} 价格
									replayTag:0,{number} 0|1 是否回播 m商品默认0
									ProductDesc {string} 描述
									ProductPics {Array} 商品图片
								}
			 *			   }
			 *
			 */
			openChatDetail: function (options) {
				window.location.href = '/forBuyerApp/contactSeller?' + utils.param({
					SessionId: options.SessionId,
					ToId: options.ToId,
					ToLoginId: options.ToLoginId,
					ToLogoUrl: options.ToLogoUrl,
					param: JSON.stringify(options.exts)
				});
			},
			/**
			 * 打开支付面板
			 * @param  {object} params 支付参数
			 *             trandingIds       交易号
			 *             isIncludeBonded   是否包含杭保订单
			 *             orderId          订单号
			 */
			openPay: function (params) {
				window.location.href = '/forYmatouApp/payMOrder?OrderId=' + params.orderId;
			},
			/**
			 * 去登录
			 *
			 */
			toLogin: function () {
				window.location.href = '/forYmatouApp/loginStatus?hasLogin=0';
			}
		});
	}

})(window);

window.hui && hui.define && hui.define('ext_ymtapi', [], function () {});
