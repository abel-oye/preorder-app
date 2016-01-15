/* global angular: true,YmtApi:true,_dc_:true */
/**
 * ymt ui 
 */
;(function(){
	'use strict';

	/**
	 * ymtUI
	 *
	 * toast
	 */
	angular.module('ymt.UI', [])
		.factory('ymtUI', [function () {
		    var toastStatus = true;
		    /**
		     * [toast description]
		     * @param  {object} opts 配置
		     *          {string} msg 文本信息
		     *          {number} duration 时间
		     */
		    var toast = function (opts) {
		        if (toastStatus) {
		            toastStatus = false;
		            var errElm = $('.ymtui-toast');
		            if (!errElm[0]) {
		                errElm = $('<div class="ymtui-toast"></div>')
		                    .appendTo('body');
		            }
		            errElm.html(opts.msg).addClass('show');

		            setTimeout(function () {
		                errElm.removeClass('show');
		                toastStatus = true;
		                opts.callback && opts.callback();
		            }, opts.duration || 2400);
		        }
		    };

		    var alert = function (opts) {
		        if (comfirmState) {
		            comfirmState = false;
		            var comfirmElm = $('.ymtui-comfirm');
		            if (!comfirmElm[0]) {
		                var html = [
		                    '<div class="ymtui-dialog ymtui-comfirm rubberBand animated">',
		                    '<div class="ymtui-commirm-hd"></div>',
		                    '<div class="ymtui-commirm-bd">',
		                    '</div>',
		                    '<div class="ymtui-commirm-ft">',
		                    '   <button type="button" class="btn btn-primary btn-full commirm">确定</button>',
		                    '</div>',
		                    '</div>',
		                ];
		                comfirmElm = $(html.join('')).appendTo('body');
		            }

		            var closeDialog = function () {
		                $('.ymtui-comfirm').removeClass('open');
		                $('.ymtui-dialog-mask').removeClass('open');
		                comfirmState = true;
		            };
		            comfirmElm.find('.ymtui-commirm-bd').text(opts.msg);

		            comfirmElm.find('.ymtui-commirm-ft .commirm').one('click', function () {
		                closeDialog();
		                opts.callback && opts.callback();
		            });

		            comfirmElm.addClass('open');
		            $('.ymtui-dialog-mask').addClass('open');
		        }
		    };

		    var comfirmState = true;
		    /**
		     * 确认框
		     * @param  {object} opts [description]
		     * @param  {function} cb 点击成功操作之后的回调
		     */
		    //@TODO 这里要转成指令操作
		    var comfirm = function (opts, callbak) {
		        if (comfirmState) {
		            comfirmState = false;
		            var comfirmElm = $('.ymtui-comfirm');
		            if (!comfirmElm[0]) {
		                var html = [
		                    '<div class="ymtui-dialog ymtui-comfirm rubberBand animated">',
		                    '<div class="ymtui-commirm-hd"></div>',
		                    '<div class="ymtui-commirm-bd">',
		                    '</div>',
		                    '<div class="ymtui-commirm-ft btn-group">',
		                    '   <div class="btn-group-col_2"><button type="button" class="btn close btn-full  btn-border-primary btn-white">取消</button></div>',
		                    '   <div class="btn-group-col_2"><button type="button" class="btn btn-primary btn-full commirm">确定</button></div>',
		                    '</div>',
		                    '</div>',
		                ];
		                comfirmElm = $(html.join('')).appendTo('body');
		            }

		            var closeDialog = function () {
		                $('.ymtui-comfirm').removeClass('open');
		                $('.ymtui-dialog-mask').removeClass('open');
		                comfirmState = true;
		            };
		            comfirmElm.find('.ymtui-commirm-bd').text(opts.msg);

		            comfirmElm.find('.ymtui-commirm-ft .close').on('click', closeDialog);
		            comfirmElm.find('.ymtui-commirm-ft .commirm').one('click', function () {
		                closeDialog();
		                callbak && callbak();
		            });

		            comfirmElm.addClass('open');
		            $('.ymtui-dialog-mask').addClass('open');
		        }
		    };

		    return {
		        toast: toast,
		        comfirm: comfirm,
		        alert: alert
		    };
	}]);
})();