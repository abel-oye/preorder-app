+(function () {
    'use strict';

    /**
     * ymtUI
     *
     * toast
     */
    angular.module('ymt.UI', []).factory('ymtUI', [function () {
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
                }, opts.duration || 1800);
            }
        }

        var alert = function (opts) {
            if(comfirmState){
                comfirmState = false;
                var comfirmElm =  $('.ymtui-comfirm');
                if(!comfirmElm[0]){
                    var html = [
                       '<div class="ymtui-dialog ymtui-comfirm rubberBand animated">',
                           '<div class="ymtui-commirm-hd"></div>',
                           '<div class="ymtui-commirm-bd">',
                           '</div>',
                           '<div class="ymtui-commirm-ft">',
                            '   <button type="button" class="btn btn-primary btn-full commirm">确定</button>',
                           '</div>',
                       '</div>',
                    ]
                    comfirmElm = $(html.join('')).appendTo('body');
                }

                var closeDialog = function(){
                    $('.ymtui-comfirm').removeClass('open');
                    $('.ymtui-dialog-mask').removeClass('open');
                    comfirmState = true;
                }
                comfirmElm.find('.ymtui-commirm-bd').text(opts.msg);

                comfirmElm.find('.ymtui-commirm-ft .commirm').one('click',function(){
                    closeDialog()
                    cb && cb();
                });

                comfirmElm.addClass('open');
                $('.ymtui-dialog-mask').addClass('open');
            }
        }

        var comfirmState = true;
        /**
         * 确认框
         * @param  {object} opts [description]
         * @param  {function} cb 点击成功操作之后的回调
         */
        //@TODO 这里要转成指令操作
        var comfirm = function (opts,cb) {
            if(comfirmState){
                comfirmState = false;
                var comfirmElm =  $('.ymtui-comfirm');
                if(!comfirmElm[0]){
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
                    ]
                    comfirmElm = $(html.join('')).appendTo('body');
                }

                var closeDialog = function(){
                    $('.ymtui-comfirm').removeClass('open');
                    $('.ymtui-dialog-mask').removeClass('open');
                    comfirmState = true;
                }
                comfirmElm.find('.ymtui-commirm-bd').text(opts.msg);

                comfirmElm.find('.ymtui-commirm-ft .close').on('click',closeDialog);
                comfirmElm.find('.ymtui-commirm-ft .commirm').one('click',function(){
                    closeDialog()
                    cb && cb();
                });

                comfirmElm.addClass('open');
                $('.ymtui-dialog-mask').addClass('open');
            }
        }

        return {
            toast: toast,
            comfirm:comfirm,
            alert:alert
        }
    }]);

    /**
     * [preOrder ]
     * @type {[type]}
     */
    var app = angular.module('preOrderApp', ['ymt.UI']);

    app.controller('preOrderApp.controller.index', [
        '$scope',
        '$http',
        'IdCardValidate',
        'AddressService',
        'ymtUI',
        '$timeout',
        function ($scope, $http, IdCardValidate, AddressService, ymtUI,$timeout) {

            //var jsApiHost = 'http://172.16.2.97:8080';
            var jsApiHost = 'http://jsapi.preorder.ymatou.com';

            var safeApply = function (fn) {
                ($scope.$$phase || $scope.$root.$phase) ? fn(): $scope.$apply(fn);
            }

            var toast = function (msg, duration) {
                ymtUI.toast({
                    msg: msg,
                    duration: duration
                })
            }

            /**
             * 对angularjs的jsonp进行包装简化调用
             * @param  {string} url   调用地址
             * @param  {object} param 参数
             * @return {Promise}
             */
            var data4jsonp = function (url, param) {
                return $http.jsonp(YmtApi.utils.addParam(YmtApi.utils.addAuth(url), YmtApi.extends(param || {}, {
                    callback: 'JSON_CALLBACK'
                })));
            }

            data4jsonp(jsApiHost + '/api/preorder/ListOrderInfo')
                .success(function (data) {
                    if (data.Code == 200) {
                        var result = data.Data;

                        $scope.orderInfo = result;

                        //保存原价
                        $scope.originalTotal = result.TotalPrice;

                        hasBonded(result.Orders);

                        checkIdCardExistInYmt();

                        $scope.productNumber = (function (orders) {
                            var num = 0,
                                i = 0,
                                len = orders.length;
                            for (; i < len; i++) {
                                num += (orders[i].Products && orders[i].Products.length || 0);
                            }
                            return num;
                        })(result.Orders);
                    }
                    else {
                        toast(data.Msg);
                    }


                });

            $scope.isUploadIdCard = true;
            /**
             * 检查身份证是否上传
             */
            function checkIdCardExistInYmt() {
                if (!$scope.hasBonded) {
                    return;
                }
                var address = $scope.orderInfo.Orders[0].Address;

                data4jsonp(jsApiHost + '/api/IdCardManage/CheckIsNeedUploadIdCard?callback=JSON_CALLBACK')
                    .success(function (ret, code) {
                        //1不用上传，2必须下单前上传，3可下单后上传
                        if (code == 200) {
                            var result =ret.Data.result;
                            safeApply(function () {
                                $scope.isUploadIdCard = result;
                            });
                        }
                        else {
                            toast(ret.Msg);
                        }
                    });
            }

            $scope.hasBonded = false;
            /**
             * 判断是否存在杭保订单
             */
            function hasBonded(orders) {
                var isBonded, i = 0,
                    len = orders.length;
                for (; i < len; i++) {
                    //验证是否存在杭保订单
                    if (orders[i].BondedArea == 3) {
                        $scope.hasBonded = true;
                        break;
                    }
                }
            }

            /**
             * 计算优惠金额
             */
            function acountDiscount(){
                var total = 0,
                    ordersList = $scope.orderInfo.Orders,
                    i =0 ,
                    len = ordersList.length;
                for(;i<len;i++){
                    total = parseFloat(total) + parseInt(ordersList[i].PromotionUsed && ordersList[i].PromotionUsed.UseCouponAmount || 0) + (ordersList[i].freeCard || 0);
                }

                $scope.discountPrice = total;
                $scope.ordersList.TotalPrice = ($scope.originalTotal - total).toFixed(2);
            }

            $scope.maskOpen = false;
            $scope.couponOpen = false;
            $scope.validateStep = 0;

            $scope.couponLoading = true;

            var currProdcut,
                getCoupon = function (order) { //获得优惠券列表
                    var Catalogs = [];

                    for (var i in order.Products) {
                        Catalogs.push({
                            CatalogId: order.Products[i].CatalogId,
                            QuotePrice: order.Products[i].QuotePrice,
                            Amount: order.Products[i].ProductNumber
                        });
                    }

                    data4jsonp(jsApiHost + '/api/preorder/ListAvailableCoupons', {
                        params: JSON.stringify(Catalogs),
                        PlatformType: YmtApi.utils.getOrderSource()
                    }).success(function (ret, code) {
                        $scope.couponLoading = false;
                        if (ret.Code == 200) {
                            var result = ret.Data;
                            $scope.couponsList = result.Coupons;
                            $scope.couponsDesc = $scope.CouponsList && $scope.CouponsList.length == 0 ? '没有可使用的优惠券' : '';
                        }
                        else {
                            toast(ret.Msg);
                        }

                    });
                };
            //打开使用优惠券
            $scope.openUserCoupon = function (order) {
                $scope.couponOpen = true;
                $scope.maskOpen = true;

                currProdcut = order;

                if (!$scope.couponsList) {
                    getCoupon(order)
                }

            }

            $scope.selectCoupon = function (coupon) {
                currProdcut.PromotionUsed = {}
                currProdcut.PromotionUsed.UseCouponCode = true;

                currProdcut.useDiscount = '满' + coupon.CouponOrderValue + (coupon.UseType == 1 ? '抵' : '返') + coupon.CouponValue;

                acountDiscount();

                $scope.closeMask();
            }

            //打开输入优惠券
            $scope.openInputCoupon = function (order) {
                $scope.validateStep = 1;
                $scope.maskOpen = true;
                $scope.coupon.code = '';

                currProdcut = order;
            }

            var currCoupon = {

            },couponInfo;

            //优惠券对象，主要存储code
            $scope.coupon = {
                btnStatus:false
            }

            var confirmCoupon = function () {
                currProdcut.PromotionUsed = {};

                currProdcut.PromotionUsed.UseCouponCode = $scope.coupon.code;
                currProdcut.PromotionUsed.inputCouponCode = true;
                //重置红包
                currProdcut.PromotionUsed.UseGiftAmount = 0;

                currProdcut.PromotionUsed.UseCouponAmount = parseInt(couponInfo.Type == 1 ? couponInfo.Value : 0, 10);

                currProdcut.useDiscount = couponInfo.Type == 1 ? '本单抵扣' + couponInfo.Value + '元' : '账户返' + couponInfo.Value + '元红包';

                acountDiscount();
            }

            //确认输入优惠券
            $scope.confirmInputCoupon = function () {
                if (!$scope.coupon.code) {
                    toast('优惠码不能为空');
                    return;
                }

                currCoupon.CouponCode = $scope.coupon.code = String.prototype.toLocaleUpperCase.call($scope.coupon.code);

                var ProductsAmount = [];
                for (var i = 0, len = currProdcut.Products.length; i < len; i++) {
                    ProductsAmount.push({
                        CatalogId: currProdcut.Products[i].CatalogId,
                        ProductId: currProdcut.Products[i].ProductId,
                        Price: currProdcut.Products[i].QuotePrice,
                        Quantity: currProdcut.Products[i].ProductNumber
                    });
                }

                data4jsonp(jsApiHost + '/api/Coupon/Bind', {
                    params: JSON.stringify({
                        ProductsAmount: ProductsAmount,
                        SellerId: currProdcut.SellerId,
                        CouponCode: $scope.coupon.code
                    }),
                    PlatformType: YmtApi.utils.getOrderSource()
                }).success(function (ret, code) {
                    if (ret.Code == 200) {
                        var data = ret.Data;
                        if (data.Status == 0) {
                            return toast(ret.Msg || '您输入的优惠码不正确或不能使用');
                        }
                        couponInfo = data.Coupon;
                        if (data.Status == 1) {
                            confirmCoupon()
                            $scope.closeMask();
                        }
                        else if (data.Status == 2) {
                            //进行身份证绑定
                            $scope.validateStep = 2;
                        }
                    }
                    else {
                        toast(ret.Msg)
                    }

                });
            }
            //验证手机号码
            var validatePhoneNumber = function () {
                var phone = $scope.phoneNumber;
                //验证是否为空
                if (phone == '') {
                    toast('手机号码不能为空,请重新输入');
                    return false;
                }
                if (!/^1[3|4|5|8][0-9]\d{8}$/.test(phone)) {
                    toast('手机号码有误，请重新输入');
                    return false;
                }
                return true;
            };

            //获得验证码
            $scope.resend = function () {
                if ($scope.btnStatus) {
                    return;
                }

                if (!validatePhoneNumber()) {
                    return;
                }

                $scope.coupon.btnStatus = true;

                var countDown = function (time) {
                   $scope.coupon.btnTxt = time + 's后重发';
                    if (time--) {
                        $timeout(function () {
                            countDown(time)
                        }, 1000);
                    }
                    else {
                       $scope.coupon.btnStatus = false;
                       $scope.coupon.btnTxt = '重新发送';
                    }
                };

                data4jsonp(jsApiHost + '/api/User/SendBindMobileValidateCode', {
                    Phone: $scope.phoneNumber
                }).success(function (result) {
                    if (result.Code != 200) {
                        $scope.coupon.btnStatus = false;
                        $scope.coupon.btnTxt = '重新发送';
                        return toast(result.Msg || '发送失败');
                    }
                    else {
                        toast('验证码已发送，请查收短信');
                        countDown(60);
                    }
                });


            };
            //完成验证
            $scope.completeValidate = function () {
                var validateCode = $scope.coupon.validCode;
                if (!validateCode || $scope.isComplete) {
                    return;
                }
                if (!validatePhoneNumber()) {
                    return;
                }
                $scope.isComplete = true;

                data4jsonp(jsApiHost + '/api/User/VerifyBindMobileValidateCode', {
                    Phone: $scope.phoneNumber,
                    Code: validateCode
                }).success(function (result) {
                    $scope.isComplete = false;
                    if (result.Code == 200) {
                        toast('已完成手机号码验证');
                        confirmCoupon();
                        $scope.closeMask();
                    }
                    else {
                        toast(result.Msg || '无法绑定此号码，请稍后再试');
                        $scope.isComplete = false;
                    }
                });
            };

            $scope.closeMask = function () {
                $scope.maskOpen = false;
                $scope.couponOpen = false;
                $scope.validateStep = 0;

            }

            /**
             * 使用红包
             */
            $scope.useGift = function (product, val) {
                if (product.isUseGift || product.usedGift == 0) {
                    return;
                }
                product.PromotionUsed = {}
                product.PromotionUsed.UseGiftAmount = product.usedGift;

                product.useDiscount = '￥' + product.usedGift + '红包';

                acountDiscount();
            }


            /**
             * 计算能使用的红包数
             */
            $scope.canUseGift = function (product) {
                product.usedGift = parseInt(product.Promotion.MaxUseGiftAmount > $scope.orderInfo.AvailableGiftAmount ? $scope.orderInfo.AvailableGiftAmount : product.Promotion.MaxUseGiftAmount) || 0;
            }

            $scope.openAddress = function () {
                switchAddressState(1);
                AddressService.queryAddressList();
            }

            //获得地址服务
            $scope.AddressService = AddressService;

            /**
             * 更改订单收货地址
             */
            var changeOrderAddress = function (address, isDel) {
                var orders = $scope.orderInfo.Orders || [],
                    orderAddress = orders.Address,
                    i = 0,
                    len = orders.length;

                if (!address || (address && address.IsDefault && isDel)) {
                    return orders[0].Address = {}
                }
                if (address.IsDefault) {
                    for (; i < len; i++) {
                        orders[i].Address = {
                            AddressId: address.AddressId || 1,
                            Addressee: address.Recipient,
                            Area: (address.ProvinceName + ',' + address.CityName + ',' + address.DistrictName),
                            DetailAddress: address.Details,
                            Email: address.Email,
                            IsDefault: address.IsDefault,
                            Mobile: address.Mobile,
                            Phone: address.Phone,
                            PostCode: address.PostCode,
                            Telphone: address.Telephone
                        }
                    }
                    checkIdCardExistInYmt();
                }


            }

            /**
             * 设置默认地址
             */
            $scope.setDefault = function (address) {
                AddressService.setDefault(address, function () {
                    toast('修改成功');
                    safeApply(function(){
                        changeOrderAddress(address);
                    });
                    //AddressService.queryAddressList();
                    switchAddressState(0)
                });
            }

            /**
             * 切换地址处理状态
             * @param  {number} state 0 是退出 1 选择列表 2 修改地址 3新增
             */
            var switchAddressState = function (state) {
                safeApply(function () {
                    $scope.addressState = state;
                });
            }

            $scope.editAddress = function (aid) {
                switchAddressState(2);
                AddressService.queryAddress(aid);
            }

            $scope.closeAddressState = function (state) {
                $scope.addressState = 0;
            }

            /**
             * 保存地址
             */
            $scope.saveAddress = function(){
                AddressService.saveAddress(AddressService.item,function(result){
                    toast('修改成功');
                    switchAddressState(1);
                    AddressService.queryAddressList();
                    if(result && result.AddressId){
                        AddressService.item.addressId = result.AddressId;
                    }
                    changeOrderAddress(AddressService.item);
                });
            }

            $scope.insterAddress = function(){
                AddressService.item = {};
                switchAddressState(2);
            }

            $scope.deleteAddress = function(aid){
                AddressService.delAddress(aid,function(){
                    switchAddressState(1);
                    AddressService.queryAddressList();
                    changeOrderAddress(AddressService.item,true);
                });
            }


            var isSubmint = false,
                isPay = false;

            $scope.saveOrderIng = false;
            $scope.idCard = {
                no:''
            }
            /**
             * 校验身份证号码
             */
            $scope.validateIdcard = function(isTips){
                if(!$scope.idCard.no || !IdCardValidate.validate(''+$scope.idCard.no)){
                    $scope.idCardError = true;
                    !isTips && toast('收货人身份证号码格式错误,请重新输入');
                    return false;
                }
                $scope.idCardError = false;
                return true;
            }

            /**
             * 保存订单
             */
            $scope.saveOrder = function () {
                if (isPay) {
                    return;
                }

                //防止表单重复提交
                if (isSubmint) {
                    return toast('订单已生成，请勿重复提交');
                }

                if(!$scope.orderInfo){
                    return;
                }

                var orderList = $scope.orderInfo.Orders;

                if (!orderList[0].Address) {
                    return toast('收件地址不能为空');
                }

                //是否需要上传身份证
                if (!$scope.isUploadIdCard && $scope.hasBonded) {
                    if (!$scope.validateIdcard()) {
                        return;
                    }
                }
                else {
                    return toSave();
                }

                $scope.idCardError = false;

                data4jsonp(jsApiHost + '/api/idCardManage/saveIdCardNumber', {
                    Name: orderList[0].Address.Addressee,
                    Phone: orderList[0].Address.Mobile,
                    CardId: $scope.idCard.no
                }).success(function (ret) {
                    if (ret.Code == 200) {
                        if (ret.Data.Result) {
                            toSave();
                        }else {
                            toast('保存身份证信息失败');
                        }
                    }else{
                        toast(ret.Msg);
                    }
                });

                /**
                 * 保存订单
                 */
                function toSave() {
                    var data = {
                            PromotionUsed: []
                        },
                        op = _dc_("getObjectParams"),
                        i = 0,
                        len = orderList.length;
                    //转换优惠使用情况
                    for (; i < len; i++) {
                        data.PromotionUsed.push(orderList[i].PromotionUsed);
                    }
                    if (op) {
                        //获得dc参数
                        data.dc = {
                            userid: op['userid'],
                            cookieid: op['cookieid'],
                            idfa: op['idfa'],
                            imei: op['imei'],
                            appid: op['appid'],
                            appversion: op['appversion'],
                            useragent: op['useragent']
                        }
                    }

                    data4jsonp(jsApiHost + '/api/PreOrder/SaveOrder', {
                        params: JSON.stringify(data)
                    }).success(function (res) {
                        isPay = true;
                        if (res.Code == 200) {
                            var result = res.Data;
                            isSubmint = true;

                            if (!(result.TradingIds && result.TradingIds[0])) {
                                toast('获取交易号失效');
                                return;
                            }

                            var trandingIds = result.TradingIds.join(',');
                            //去支付
                            YmtApi.openPay({
                                trandingIds: result.TradingIds[0],
                                isIncludeBonded: result.IncludeXloboBonded,
                                orderId: (function (orderIds) {
                                    if (!orderIds) return null;
                                    /*if(~orderIds.indexOf(',')){
                                        return orderIds.split(',')[0]
                                    }else{
                                        return orderIds;
                                    }*/
                                    return orderIds[0]
                                })(result.OrderIds),
                                exts: {
                                    AccessToken: YmtApi.utils.getAuthInfo().AccessToken
                                }
                            });

                        }
                        else {
                            toast(res.Msg)
                        }
                    });
                }

            }

        }
    ]);

    /**
     * 身份证15位编码规则：dddddd yymmdd xx p
     * dddddd：地区码
     * yymmdd: 出生年月日
     * xx: 顺序类编码，无法确定
     * p: 性别，奇数为男，偶数为女
     * <p />
     * 身份证18位编码规则：dddddd yyyymmdd xxx y
     * dddddd：地区码
     * yyyymmdd: 出生年月日
     * xxx:顺序类编码，无法确定，奇数为男，偶数为女
     * y: 校验码，该位数值可通过前17位计算获得
     * <p />
     * 18位号码加权因子为(从右到左) Wi = [ 7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2,1 ]
     * 验证位 Y = [ 1, 0, 10, 9, 8, 7, 6, 5, 4, 3, 2 ]
     * 校验位计算公式：Y_P = mod( ∑(Ai×Wi),11 )
     * i为身份证号码从右往左数的 2...18 位; Y_P为脚丫校验码所在校验码数组位置
     *
     */
    app.factory('IdCardValidate', [function () {
        var Wi = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2, 1]; // 加权因子
        var ValideCode = [1, 0, 10, 9, 8, 7, 6, 5, 4, 3, 2]; // 身份证验证位值.10代表X
        function IdCardValidate(idCard) {
            idCard = trim(idCard.replace(/ /g, ""));
            if (idCard.length == 15) {
                return isValidityBrithBy15IdCard(idCard);
            }
            else if (idCard.length == 18) {
                var a_idCard = idCard.split(""); // 得到身份证数组
                if (isValidityBrithBy18IdCard(idCard) && isTrueValidateCodeBy18IdCard(a_idCard)) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        /**
         * 判断身份证号码为18位时最后的验证位是否正确
         * @param a_idCard 身份证号码数组
         * @return
         */
        function isTrueValidateCodeBy18IdCard(a_idCard) {
            var sum = 0,
                valCodePosition; // 声明加权求和变量
            if (a_idCard[17].toLowerCase() == 'x') {
                a_idCard[17] = 10; // 将最后位为x的验证码替换为10方便后续操作
            }
            for (var i = 0; i < 17; i++) {
                sum += Wi[i] * a_idCard[i]; // 加权求和
            }
            valCodePosition = sum % 11; // 得到验证码所位置
            if (a_idCard[17] == ValideCode[valCodePosition]) {
                return true;
            }
            else {
                return false;
            }
        }
        /**
         * 通过身份证判断是男是女
         * @param idCard 15/18位身份证号码
         * @return 'female'-女、'male'-男
         */
        function maleOrFemalByIdCard(idCard) {
            idCard = trim(idCard.replace(/ /g, "")); // 对身份证号码做处理。包括字符间有空格。
            if (idCard.length == 15) {
                if (idCard.substring(14, 15) % 2 == 0) {
                    return 'female';
                }
                else {
                    return 'male';
                }
            }
            else if (idCard.length == 18) {
                if (idCard.substring(14, 17) % 2 == 0) {
                    return 'female';
                }
                else {
                    return 'male';
                }
            }
            else {
                return null;
            }
            //  可对传入字符直接当作数组来处理
            // if(idCard.length==15){
            // alert(idCard[13]);
            // if(idCard[13]%2==0){
            // return 'female';
            // }else{
            // return 'male';
            // }
            // }else if(idCard.length==18){
            // alert(idCard[16]);
            // if(idCard[16]%2==0){
            // return 'female';
            // }else{
            // return 'male';
            // }
            // }else{
            // return null;
            // }
        }
        /**
         * 验证18位数身份证号码中的生日是否是有效生日
         * @param idCard 18位书身份证字符串
         * @return
         */
        function isValidityBrithBy18IdCard(idCard18) {
            var year = idCard18.substring(6, 10);
            var month = idCard18.substring(10, 12);
            var day = idCard18.substring(12, 14);
            var temp_date = new Date(year, parseFloat(month) - 1, parseFloat(day));
            // 这里用getFullYear()获取年份，避免千年虫问题
            if (temp_date.getFullYear() != parseFloat(year) || temp_date.getMonth() != parseFloat(month) - 1 || temp_date.getDate() != parseFloat(day)) {
                return false;
            }
            else {
                return true;
            }
        }
        /**
         * 验证15位数身份证号码中的生日是否是有效生日
         * @param idCard15 15位书身份证字符串
         * @return
         */
        function isValidityBrithBy15IdCard(idCard15) {
            var year = idCard15.substring(6, 8);
            var month = idCard15.substring(8, 10);
            var day = idCard15.substring(10, 12);
            var temp_date = new Date(year, parseFloat(month) - 1, parseFloat(day));
            // 对于老身份证中的你年龄则不需考虑千年虫问题而使用getYear()方法
            if (temp_date.getYear() != parseFloat(year) || temp_date.getMonth() != parseFloat(month) - 1 || temp_date.getDate() != parseFloat(day)) {
                return false;
            }
            else {
                return true;
            }
        }
        //去掉字符串头尾空格
        function trim(str) {
            return str.replace(/(^\s*)|(\s*$)/g, "");
        }

        return {
            validate: IdCardValidate
        }
    }]);

    //禁止滚动条
    app.directive('disabledScroll', [
        function () {
            return {
                restrict: 'A',
                link: function (scope, ele) {
                    ele[0].addEventListener('touchmove', function (event) {
                        event.preventDefault();
                    }, false);
                }
            };
        }
    ]);

    app.directive('switchPage', [
        function () {
            return {
                restrict: 'A',
                scope: {
                    switchPage: '='
                },
                link: function (scope, ele) {
                    var $ele = $(ele[0]);

                    scope.$watch('switchPage', function (l) {
                        //出现 且自己不是当前页
                        if (l && !$ele.hasClass('pt-page-current')) {
                            $('body').addClass('pt-page-container');
                            $ele.addClass('pt-page-moveFromRight')
                                .on('webkitAnimationEnd animationend', function () {
                                    $(this).removeClass('pt-page-moveFromRight')
                                        .addClass('pt-page-current');
                                    $('body').removeClass('pt-page-container')
                                });
                        }
                        //退出 且自己是当前页
                        if (!l && $ele.hasClass('pt-page-current')) {
                            $('body').addClass('pt-page-container');
                            $ele.addClass('pt-page-moveToRight')
                                .on('webkitAnimationEnd animationend', function () {
                                    $(this).removeClass('pt-page-moveToRight')
                                        .removeClass('pt-page-current');
                                    $('body').removeClass('pt-page-container')
                                });
                        }
                    });
                }
            }
        }
    ]);

    /**
     * 地址服务
     */
    app.factory('AddressService', [
        '$http',
        '$window',
        'ymtUI',
        function ($http, $window, ymtUI) {

            var jsApiHost = 'http://jsapi.preorder.ymatou.com';

            var addressService = {
                list: [],
                item: {}
            };

            var toast = function (msg, duration) {
                ymtUI.toast({
                    msg: msg,
                    duration: duration
                })
            }

            /**
             * 对angularjs的jsonp进行包装简化调用
             * @param  {string} url   调用地址
             * @param  {object} param 参数
             * @return {Promise}
             */
            var data4jsonp = function (url, param) {
                return $http.jsonp(YmtApi.utils.addParam(YmtApi.utils.addAuth(url), YmtApi.extends(param || {}, {
                    callback: 'JSON_CALLBACK'
                })));
            }


            addressService.setDefault = function (address, callback) {
                address.IsDefault = true;
                addressService.saveAddress(address, callback);
            };

            addressService.select = {};

            addressService.selectCity = function (id) {
                for (var i in addressService.cityList['0']) {
                    if (addressService.item.ProvinceName == addressService.cityList['0'][i]) {
                        addressService.select.CityNameId = '0,' + i;
                        addressService.selectCityObj = addressService.cityObj['0,' + i]
                    };
                }
                //addressService.select.DistrictNameId = undefined;
                addressService.selectDistrictObj = '';
            };

            addressService.areaCity = function (id) {
                for (var i in addressService.cityList[addressService.select.CityNameId]) {
                    if (addressService.item.CityName == addressService.cityList[addressService.select.CityNameId][i]) {
                        //addressService.select.DistrictNameId = addressService.select.CityNameId + ',' + i;
                        addressService.selectDistrictObj = addressService.cityObj[addressService.select.CityNameId + ',' + i]
                    }
                }
            };

            ///@TODO 这个接口新增一个检查用户是否有邮箱的接口
           /* data4jsonp('/api/getUserInfo').success(function (resultUser, code) {
                if (code == '200') {
                    addressService.hasEmail = !!resultUser.ProfileInfo.Email;
                }
            });*/
            /**
             * 获得城市列表
             * 先从本地获取如果本地存在就不在往服务器获取
             *
             */
            var getCityList = function (cb) {

                var cityListStr = localStorage.getItem('cityListStr');

                if(cityListStr){
                    try{
                        addressService.cityList = JSON.parse(cityListStr);
                        addressService.cityObj = parseCity(addressService.cityList);
                        cb && cb();
                    }catch(e){
                        console.log(e);
                        localStorage.removeItem('cityListStr')
                        getCityListJson()
                    }
                }else{
                    getCityListJson();
                }

                function getCityListJson(){
                    data4jsonp(jsApiHost+'/api/address/CityListByJson').success(function (ret) {
                        if(ret.Code == 200){
                            var city = ret.Data.City;
                            addressService.cityList = city;
                            addressService.cityObj = parseCity(JSON.parse(city));
                            cb && cb();
                            //保存放在主流程之后
                            try{
                                localStorage.setItem('cityListStr',city);
                            }catch(e){}

                        }else{
                            toast(ret.Msg);
                        }

                    });
                }

                function parseCity(cityObj){
                    var cityList = {};
                    for (var i in cityObj) {
                        var tempAttr = [];
                        for (var j in cityObj[i]) {
                            var temp = {};
                            temp['id'] = i + ',' + j;
                            temp['name'] = cityObj[i][j];
                            tempAttr.push(temp);
                        }
                        cityList[i] = tempAttr;
                    }
                    return cityList;
                }

            }

            /**
             * 获得单个地址
             */
            addressService.queryAddress = function (aid) {
                    data4jsonp(jsApiHost + '/api/address/GetAddressById?AddressId=' + aid)
                        .success(function (result, code) {
                            var resultAddress;
                            if (result.Code == 200) {
                                if (result.Data && (resultAddress = result.Data.Address)) {
                                    addressService.item = resultAddress;
                                    console.log(addressService.item)
                                    getCityList(function () {
                                        addressService.selectCity();
                                        addressService.areaCity();
                                    });
                                }
                            }
                            else {
                                toast(result.Msg)
                            }
                        });
                }
                /**
                 * 获得当前用户的地址列表
                 */
            addressService.queryAddressList = function () {
                getCityList(function(){
                    console.log(addressService,'2222')
                });
                /*用户收货地址列表*/
                data4jsonp(jsApiHost + '/api/address/addressList')
                    .success(function (result, code) {
                        var resultAddress;
                        if (result.Code == 200) {
                            if (result.Data && (resultAddress = result.Data.AddressList) && resultAddress[0]) {
                                addressService.list = resultAddress.slice(0, 5);
                                console.log(addressService.list)
                            }
                        }
                        else {
                            toast(result.Msg)
                        }
                    });
            }


            /**
             * 保存收货地址
             * @param  {object}   obj [description]
             * @param  {Function} cb  回调
             * @return {[type]}       [description]
             */
            addressService.saveAddress = function (obj, cb) {
                var title = '添加',
                    url = 'addAddress';
                if (obj && obj.AddressId) {
                    title = '修改';
                    url = 'editAddress';
                }

                if (!obj) {
                    toast('请填写收货人信息');
                    return false;
                }


                if (!obj.Recipient || obj.Recipient === '' || !obj.Mobile || obj.Mobile === '') {
                    toast('收货人或手机不允许为空');
                    return false;
                }

                if (!/^([\u4e00-\u9fa5])*$/.test(obj.Recipient)) {
                    toast('收货人姓名只能是中文');
                    return false;
                }

                if (!/^\d{11}$/.test(obj.Mobile)) {
                    toast('手机号码必须是11位的数字');
                    return false;
                }

                if (!obj.CityName || obj.CityName == '' || !obj.DistrictName || obj.DistrictName == '' || !obj.ProvinceName || obj.ProvinceName == '' || !obj.Details || obj.Details == '' || !obj.PostCode || obj.PostCode == '') {
                    toast('地址与邮编填写不完整');
                    return false;
                }
                if (/^((\d)*|([a-z]|[A-Z]))$/.test(obj.Details)) {
                    toast('地址不能只是数字和字母');
                    return false;
                }
                if (!/^\d*$/.test(obj.PostCode)) {
                    toast('邮政编码只能是数字');
                    return false;
                }
                /*if (!addressService.hasEmail && !(/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(obj.Email))) {
                    toast('邮箱地址不正确');
                    return false;
                }*/

                data4jsonp(jsApiHost+'/api/address/'+url, {
                    params:JSON.stringify(obj)
                }).success(function (ret) {
                    if(ret.Code == 200){
                         cb && cb(ret.Data);
                    }else{
                        toast(ret.Msg);
                    }

                });
            };

            addressService.delAddress = function (aid, cb) {
                ymtUI.comfirm({
                    msg:'是否删除收货地址？'
                }, function () {
                    data4jsonp(jsApiHost+'/api/address/deleteaddress', {
                        AddressId: aid
                    }).success(function (resultAddress) {
                        if (resultAddress.Result != 'false') {
                            cb && cb();
                        }
                        else {
                            toast('删除地址错误');
                        }
                    });
                });
            };

            return addressService;
        }
    ]);

/**
 * 溢出标签浮动
 */
app.directive('overflowFixed', ['$window',
    function ($window) {
        return {
            restrict: 'A',
            link: function (scope, ele) {
                var $ele=$(ele[0]),
                    top = $ele.offset().top,
                    height = $ele.height(),
                    clsName = ele.overflowFixed;

                var isNeedfixed = function() {
                    if ($(document).scrollTop() > parseInt(top) + parseInt(height)) {
                        $ele.addClass(clsName);
                    } else {
                        $ele.removeClass(clsName);
                    }
                };
                $ele.on('click',function(){
                    var top = $ele.parent().offset().top;
                    $($window).scrollTop(top);
                })
                $(document).on('scroll',isNeedfixed);
            }
        };
    }
]);

})();
