/* global angular: true,YmtApi:true,_dc_:true */

;(function () {
    'use strict';
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
        function ($scope, $http, IdCardValidate, AddressService, ymtUI, $timeout) {

            //var jsApiHost = 'http://172.16.2.97:8080';
            var jsApiHost = 'http://jsapi.preorder.ymatou.com';

            var safeApply = function (fn) {
                ($scope.$$phase || $scope.$root.$phase) ? fn(): $scope.$apply(fn);
            };

            $scope.state = {
                inInput:false
            }

            var toast = function (msg, duration) {
                ymtUI.toast({
                    msg: msg,
                    duration: duration
                });
            };

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
            };

            $scope.discountPrice = 0;


            $scope.load = false;

            $scope.leaveMessage = {
                content:''
            }

            /**
             * 小计价格
             * @param order
             */
            $scope.totalPrice = function(order){
                var i=0,len=order.Products.length,price=0;
                for(;i<len;i++){
                    price += order.Products[i].QuotePrice * order.Products[i].ProductNumber;
                }
                return price;
            }

            /**
             * 小计运费
             * @param order
             */
            $scope.totalFreight = function(order){
                var i=0,len=order.Products.length,freight=0;
                for(;i<len;i++){
                    freight += order.Products[i].Freight;
                }
                return freight;
            }

            /**
             * 统计商品数量
             * @param order {object} 订单对象 如果不传递则获取所有订单商品
             *                       数量
             */
            $scope.totalProNum = function(order){
                var num = 0,
                    i = 0,
                    len = orders.length;
                for (; i < len; i++) {
                    num += orders[i].ProductNumber;
                }
                return num;
            }

            $scope.logisticsConversion = function (data) {
                //物流优惠
                var logisticsBenefits = '';
                if (data.Freight == 0) {
                    logisticsBenefits += '包邮';
                }
                if (data.IsTariffType) {
                    logisticsBenefits += '包税';
                }
                //物流优惠
                return logisticsBenefits;

            }
            $scope.isOnLoad = true;
            /**
             * 获得预订单列表
             */
            data4jsonp(jsApiHost + '/api/preorder/ListOrderInfo')
                .success(function (data) {
                     $scope.load = true;
                    if (data.Code == 200) {
                        $scope.isOnLoad  = false;
                        var result = data.Data;

                        $scope.orderInfo = result;

                        var orders = result.Orders;

                        if(orders && orders[0]){
                            //获得可使用的优惠券列表
                            //默认先拉取第一个商品的优惠券信息
                            //@TODO 如果要支持多订单这里需要调整
                            getCoupon(orders[0]);

                            //存在可以提交的订单
                            $scope.canSubmint = true;

                            //保存原价
                            $scope.originalTotal = result.TotalPrice = parseFloat(result.TotalPrice.toFixed(2));

                            hasBonded(orders);

                            checkIdCardExistInYmt();

                            $scope.productNumber = (function (orders) {
                                var num = 0,
                                    i = 0,
                                    len = orders.length;
                                for (; i < len; i++) {
                                    num += orders[i].ProductNumber;
                                }
                                return num;
                            })(orders);

                        }


                    }
                    else {
                        toast(data.Msg);
                    }


                });

            $scope.isUploadIdCard = false;
            /**
             * 检查身份证是否上传
             */
            function checkIdCardExistInYmt() {

                var address = $scope.orderInfo.Orders[0].Address;

                if (!$scope.hasBonded || !address.AddressId) {
                    return;
                }

                data4jsonp(YmtApi.utils.addParam(jsApiHost + '/api/IdCardManage/CheckIsNeedUploadIdCard?callback=JSON_CALLBACK'),{
                    ReceiverName :address.Addressee,
                    ReceiverMobile :address.Mobile
                }).success(function (ret, code) {
                        //1不用上传，2必须下单前上传，3可下单后上传
                        if (ret.Code == 200) {
                            var result = ret.Data.Result;
                            safeApply(function () {
                                $scope.isUploadIdCard = result == 2;
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
                var i = 0,
                    len = orders.length;
                for (; i < len; i++) {
                    //验证是否存在杭保订单
                    if (orders[i].BondedArea == 1 || orders[i].BondedArea == 2 || orders[i].BondedArea == 3) {
                        $scope.hasBonded = true;
                        break;
                    }
                }
            }

            /**
             * 计算优惠金额
             */
            function acountDiscount() {
                var total = 0,
                    ordersList = $scope.orderInfo.Orders,
                    i = 0,
                    len = ordersList.length;
                for (; i < len; i++) {
                    total = parseFloat(total) + parseInt(ordersList[i].PromotionUsed && ordersList[i].PromotionUsed.UseCouponAmount || 0) + (ordersList[i].freeCard || 0) + (ordersList[i].PromotionUsed.UseGiftAmount || 0);
                }

                $scope.discountPrice = total.toFixed(2);
                $scope.orderInfo.TotalPrice = ($scope.originalTotal - total).toFixed(2);
            }

            $scope.maskOpen = false;
            $scope.couponOpen = false;
            $scope.validateStep = 0;

            /**
             * 优惠券列表加载状态
             * @type {Boolean}
             */
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
                        PlatformType: YmtApi.utils.getOrderSource(),
                        sellerId: order.SellerId,
                        TotalPrice: order.TotalPrice
                    }).success(function (ret, code) {
                        $scope.couponLoading = false;
                        if (ret.Code == 200) {
                            var result = ret.Data;
                            order.isLoadCoupon = true;

                            $scope.couponsList = result.Coupons || [];

                            //默认选中第一张
                            if($scope.couponsList[0]){
                                currProdcut = order;
                                $scope.selectCoupon($scope.couponsList[0]);
                                $scope.coupon.selectCouponIndex = 0;
                                $scope.switchCoupon(order);
                            }else{
                                order.useDiscount = '没有可使用的优惠券';
                                $scope.coupon.selectCouponIndex = 0;
                            }
                        }
                        else {
                            toast(ret.Msg);
                        }

                    });
                };
            //打开使用优惠券
            $scope.openUserCoupon = function (order) {

                //当已经选中优惠码 优惠券不能点击
                if($scope.couponType === 2){
                    return;
                }

                //判断当前订单是否已经加载过优惠券列表了
                if(!order.isLoadCoupon){
                    return toast('正在加载可使用的优惠券');
                }

                if(!$scope.couponsList[0]){
                    return;
                }

                $scope.couponOpen = true;
                $scope.maskOpen = true;

                currProdcut = order;                

                /*if (!$scope.couponsList) {
                    getCoupon(order);
                }*/

            };

            //切换优惠券选择状态
            $scope.switchCoupon = function(order){
               
                var promotionUsed = order.PromotionUsed;
                order.useCouponDesc = '';
                if(promotionUsed.UseCouponCode && !promotionUsed.inputCouponCode){
                    order.PromotionUsed = {};
                    $scope.couponType = 0;
                    
                    acountDiscount();
                }else{
                    //判断是否被选择过优惠券
                    if(order.selectCoupon){
                        $scope.selectCoupon(order.selectCoupon);
                    }else{
                        $scope.openUserCoupon(order);
                    }
                }
            }

            //切换优惠券输入状态
            $scope.switchInputCoupon = function(order){
               
                var promotionUsed = order.PromotionUsed;
                order.useCouponDesc = '';
                if($scope.couponType == 2){
                    order.PromotionUsed = {};                    
                    $scope.couponType = 0;
                    acountDiscount();

                }else{
                    $scope.couponType = 2;
                    order.PromotionUsed = {};
                    if(couponInfo){
                        confirmCoupon();
                    }else{
                        $scope.confirmInputCoupon(order);
                    }
                    acountDiscount();
                }
            }

            /**
             * 选择可使用的优惠券
             */
            $scope.selectCoupon = function (coupon,index) {

                index = index || $scope.coupon.selectCouponIndex || 0;
                coupon = coupon || $scope.couponsList[index];
                //作为切换选中和取消选中的优惠券计算；
                currProdcut.selectCoupon = coupon;

                currProdcut.PromotionUsed = {};
                currProdcut.PromotionUsed.UseCouponCode =  coupon.CouponCode;

                //currProdcut.useCouponDesc = '满' + coupon.CouponOrderValue + (coupon.UseType == 1 ? '抵' : '返') + coupon.CouponValue;
                currProdcut.useCouponDesc =  (coupon.UseType == 1 ? '抵扣' : '返红包') + '￥' +coupon.CouponValue;
                currProdcut.useDiscount = '满' + coupon.CouponOrderValue + (coupon.UseType == 1 ? '抵' : '返') + coupon.CouponValue;

                if (coupon.UseType == 1) {
                    currProdcut.PromotionUsed.UseCouponAmount = coupon.CouponValue;
                }

                acountDiscount();

                $scope.closeMask();

                $scope.couponType = 1;

                $scope.selectCouponIndex = index;
            };

           /* $scope.$watch('selectCouponIndex',function(c,n){
                console.log(c,n)
            })
*/
            var currCoupon = {

                },
                couponInfo;

            //优惠券对象，主要存储code
            $scope.coupon = {
                btnStatus: false
            };

            var confirmCoupon = function () {
                currProdcut.PromotionUsed = {};

                currProdcut.PromotionUsed.UseCouponCode = $scope.coupon.code;
                currProdcut.PromotionUsed.inputCouponCode = true;
                //重置红包
                currProdcut.PromotionUsed.UseGiftAmount = 0;

                currProdcut.PromotionUsed.UseCouponAmount = parseInt(couponInfo.Type == 1 ? couponInfo.Value : 0, 10);

                //currProdcut.useCouponDesc = couponInfo.Type == 1 ? '本单抵扣' + couponInfo.Value + '元' : '账户返' + couponInfo.Value + '元红包';
                currProdcut.useCouponDesc = '满'+couponInfo.CouponOrderValue+(couponInfo.Type == 1 ?'减':'返')+ parseInt(couponInfo.Value);

                acountDiscount();

                $scope.couponType = 2;
            };

            var lastCode;
            $scope.isvalidCouponCode = false;
            //确认输入优惠券
            $scope.confirmInputCoupon = function (order) {
                var couponCode = $scope.coupon.code;

                if(couponCode){
                    if(lastCode === couponCode){
                        return;
                    }
                }else{
                    order.PromotionUsed.UseCouponCode = '';
                    order.PromotionUsed.UseCouponAmount = 0;
                    couponInfo = null;
                    order.useCouponDesc = '';
                    return
                }

                if(order.PromotionUsed.inputCouponCode){
                     order.PromotionUsed.UseCouponCode = '';
                     currProdcut.PromotionUsed.UseCouponAmount = 0;
                     acountDiscount();
                     //order.useDiscount = '';
                 }else{
                    //$scope.coupon.code = '';

                    currProdcut = order;
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
                $scope.isvalidCouponCode = true;

                data4jsonp(jsApiHost + '/api/Coupon/Bind', {
                    params: JSON.stringify({
                        ProductsAmount: ProductsAmount,
                        SellerId: currProdcut.SellerId,
                        CouponCode: couponCode
                    }),
                    PlatformType: YmtApi.utils.getOrderSource()
                }).success(function (ret, code) {
                    $scope.isvalidCouponCode = false;
                    if (ret.Code == 200) {
                        var data = ret.Data;
                        if (data.Status + '' === '0') {
                            if($scope.couponType == 2){
                                $scope.couponType = 0;   
                            }
                            return toast(ret.Msg || '哈尼，输入的优惠码有错唉');
                        }
                        couponInfo = data.Coupon;
                        if (data.Status + '' === '1') {
                            lastCode = couponCode;
                            confirmCoupon();
                            $scope.closeMask();
                        }else if (data.Status == 2) {
                            //进行身份证绑定
                            $scope.validateStep = 2;
                        }
                    }
                    else {
                        $scope.couponType = 0;
                        toast(ret.Msg);
                    }

                });
            };
          
           

            $scope.closeMask = function () {
                $scope.maskOpen = false;
                $scope.couponOpen = false;
                $scope.validateStep = 0;
                $scope.entrustOpenStatus = false;

            };

            /**
             * 使用红包
             */
            $scope.useGift = function (product, val) {

                if(product.PromotionUsed.UseGiftAmount){
                    product.PromotionUsed.UseGiftAmount = 0;
                    //product.useDiscount = '';
                    $scope.couponType = 0;
                }else{
                    if (product.isUseGift || product.usedGift === 0) {
                        return;
                    }
                    product.PromotionUsed = {};
                    product.PromotionUsed.UseGiftAmount = product.usedGift;

                    $scope.couponType = 3;
                    product.useCouponDesc = '抵扣￥' + product.usedGift;
                }

               

                acountDiscount();
            };


            /**
             * 计算能使用的红包数
             */
            $scope.canUseGift = function (product) {
                product.usedGift = parseInt(Math.min(product.Promotion.MaxUseGiftAmount,$scope.orderInfo.AvailableGiftAmount)) || 0;
            };

            $scope.openAddress = function () {
                switchAddressState(1);
                AddressService.queryAddressList();
            };

            $scope.openEntrust = function(){
                $scope.entrustOpenStatus = true;
                $scope.maskOpen = true;
            }

            //获得地址服务
            $scope.AddressService = AddressService;

            /**
             * 更改订单收货地址
             */
            var changeOrderAddress = function (address, isDel) {
                var orders = $scope.orderInfo.Orders || [],
                    i = 0,
                    len = orders.length;

                if (!address || (address && address.IsDefault && isDel)) {
                    orders[0].Address = {};
                    return;
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
                        };
                    }
                    checkIdCardExistInYmt();
                }


            };

            /**
             * 设置默认地址
             */
            $scope.setDefault = function (address) {
                AddressService.setDefault(address, function () {
                    toast('修改成功');
                    changeOrderAddress(address);
                    AddressService.queryAddressList();
                    switchAddressState(0);
                });
            };

            /**
             * 切换地址处理状态
             * @param  {number} state 0 是退出 1 选择列表 2 修改地址 3新增
             */
            var switchAddressState = function (state) {
                safeApply(function () {
                    $scope.addressState = state;
                });
            };

            $scope.editAddress = function (aid) {
                switchAddressState(2);
                AddressService.queryAddress(aid);
            };

            $scope.closeAddressState = function (state) {
                $scope.addressState = 0;
            };

            /**
             * 保存地址
             */
            $scope.saveAddress = function () {
                AddressService.saveAddress(AddressService.item, function (result) {
                    toast('修改成功');
                    AddressService.queryAddressList();
                    switchAddressState(1);
                    if (result && result.AddressId) {
                        AddressService.item.addressId = result.AddressId;
                    }
                    changeOrderAddress(AddressService.item);
                });
            };

            $scope.insterAddress = function () {
                AddressService.item = {
                    ProvinceName:'选择省份',
                    CityName:'选择市',
                    DistrictName:'选择县区'
                };
                AddressService.selectCity(1);
                AddressService.areaCity(1);
                switchAddressState(2);
            };

            $scope.deleteAddress = function (aid) {
                AddressService.delAddress(aid, function () {
                    AddressService.queryAddressList(function(){

                    });
                    switchAddressState(1);
                    changeOrderAddress(AddressService.item, true);
                });
            };

            //是否可以提交
            $scope.canSubmint = false;

            $scope.isPay = false;

            $scope.saveOrderIng = false;
            $scope.idCard = {
                no: ''
            };

            /**
             * 校验身份证号码
             */
            $scope.validateIdcard = function (isTips) {
                if (!$scope.idCard.no || !IdCardValidate.validate('' + $scope.idCard.no)) {
                    $scope.idCardError = true;
                    !isTips && toast('收货人身份证号码格式错误,请重新输入');
                    return false;
                }
                $scope.idCardError = false;
                return true;
            };

            /**
             * 保存订单
             */
            $scope.saveOrder = function () {

                if ($scope.isPay || $scope.isOnLoad) {
                    return;
                }

                //@TODO 这里多订单需要优化
                //避免用户输入完优惠码马上点击提交，这里做一次防提交处理
                //选择了类型为输入，且输入了优惠码 但没有优惠码值 则视为在校验优惠码中
                if(($scope.couponType === 2 
                        && $scope.coupon.code
                        && !$scope.orderInfo.Orders[0].PromotionUsed.inputCouponCode) || $scope.isvalidCouponCode){
                    return;
                }

                //防止表单重复提交
                if (!$scope.canSubmint) {
                    return toast('订单已生成，请勿重复提交');
                }

                $scope.isPay = true;

                $scope.canSubmint = false;

                if (!$scope.orderInfo) {
                    return;
                }

                var orderList = $scope.orderInfo.Orders;

                if (!orderList[0].Address) {
                    return toast('收件地址不能为空');
                }

                //是否需要上传身份证
                if ($scope.isUploadIdCard && $scope.hasBonded) {
                    if (!$scope.validateIdcard()) {
                        $scope.canSubmint = true;
                        $scope.isPay = false;
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
                        }
                        else {
                            toast('保存身份证信息失败');
                            //只要失败
                            $scope.canSubmint = true;
                            $scope.isPay = false;
                        }
                    }
                    else {
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
                        op = _dc_('getObjectParams'),
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
                        };
                    }
                    var ua = window.navigator.userAgent,
                        search = YmtApi.utils.getUrlObj();
                    data4jsonp(jsApiHost + '/api/PreOrder/SaveOrder', {
                        params: JSON.stringify(data),
                        orderSource: YmtApi.utils.getOrderSource(),
                        ClientType: /\(i[^;]+;( U;)? CPU.+Mac OS X/ig.test(ua) ? 3 : /Android|Linux/ig.test(ua) ? 4 : 0,
                        DeviceId: search.DeviceId || search.DeviceToken || '0000000',
                        channel:(ua.match(/Channel\=(?:([^\s]*))/i) || [])[1] || 'wap',//获得app下载渠道
                        ThirdId:search.ThirdId,
                        LeaveMessage:$scope.leaveMessage.content//留言
                    }).success(function (res) {
                        if (res.Code == 200) {
                            var result = res.Data;

                            if (!(result.TradingIds && result.TradingIds[0])) {
                                toast('获取交易号失效');
                                return;
                            }

                            //var trandingIds = result.TradingIds.join(',');
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
                                    return orderIds[0];
                                })(result.OrderIds),
                                exts: {
                                    AccessToken: YmtApi.utils.getAuthInfo().AccessToken
                                }
                            });

                        }
                        else {
                            $scope.isPay = false;
                            //只要失败
                            $scope.canSubmint = true;
                            toast(res.Msg);
                        }
                    }).error(function(data){
                        console.log(data)
                        $scope.isPay = false;
                        //只要失败
                        $scope.canSubmint = true;
                        toast('操作失败，请重试！');
                    });
                }

            };

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
            idCard = trim(idCard.replace(/ /g, ''));
            if (idCard.length == 15) {
                return isValidityBrithBy15IdCard(idCard);
            }
            else if (idCard.length == 18) {
                var a_idCard = idCard.split(''); // 得到身份证数组
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
            if (a_idCard[17].toLowerCase() === 'x') {
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
            idCard = trim(idCard.replace(/ /g, '')); // 对身份证号码做处理。包括字符间有空格。
            if (idCard.length == 15) {
                if (idCard.substring(14, 15) % 2 === 0) {
                    return 'female';
                }
                else {
                    return 'male';
                }
            }
            else if (idCard.length == 18) {
                if (idCard.substring(14, 17) % 2 === 0) {
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
            return str.replace(/(^\s*)|(\s*$)/g, '');
        }

        return {
            validate: IdCardValidate
        };
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
    /**
     * 判断是什么系统增加相应class
     * mac系统 ws-mac
     * iphone手机 ws-iphone
     * android环境 ws-android
     * 微信 ws-wechat
     * 扫货 ws-saohuo
     *
     * 这个指令应该加载顶级元素
     */
    app.directive('whatSystem', [
        function () {
            return {
                restrict: 'A',
                link: function (scope, ele) {
                    var ua = window.navigator.useragent,
                        clsName='';
                    if(YmtApi.isIos){
                        clsName += ' ws-mac';
                        if(YmtApi.isIphone){
                            clsName += ' ws-iphone';
                        }
                    }else if(YmtApi.isAndroid){
                        clsName += ' ws-android';
                    }                    
                    
                    if(YmtApi.isWechat){
                        clsName += ' ws-wechat';
                    }else if(YmtApi.isSaohuoApp){
                        clsName += ' ws-saohuo';
                    }
                    ele[0].className += ' '+clsName;
                }
            };
        }
    ]);

     //获得焦点
    app.directive('getFocus', [
        function () {
            return {
                restrict: 'A',
                scope:{getFocus:'='},
                link: function (scope, ele) {
                    scope.$watch('getFocus',function(n,l){
                        if(n){
                            ele[0].focus();
                        }
                    });                   
                }
            };
        }
    ]);


    /**
     * 禁止事件冒泡
     */
   /* app.directive('stopPropagation', [
        function () {
            return {
                restrict: 'A',
                link: function (scope, ele,attr) {
                    console.log(2)
                    var startY = 0;

                        // Store enabled status
                        var enabled = false;

                        var handleTouchmove = function(evt) {
                            console.log(handleTouchmove)
                            // Get the element that was scrolled upon
                            var el = evt.target;

                            // Check all parent elements for scrollability
                            while (el !== document.body) {
                                // Get some style properties
                                var style = window.getComputedStyle(el);

                                if (!style) {
                                    // If we've encountered an element we can't compute the style for, get out
                                    break;
                                }

                                var scrolling = style.getPropertyValue('-webkit-overflow-scrolling');
                                var overflowY = style.getPropertyValue('overflow-y');
                                var height = parseInt(style.getPropertyValue('height'), 10);

                                // Determine if the element should scroll
                                var isScrollable = scrolling === 'touch' && (overflowY === 'auto' || overflowY === 'scroll');
                                var canScroll = el.scrollHeight > el.offsetHeight;

                                if (isScrollable && canScroll) {
                                    // Get the current Y position of the touch
                                    var curY = evt.touches ? evt.touches[0].screenY : evt.screenY;

                                    // Determine if the user is trying to scroll past the top or bottom
                                    // In this case, the window will bounce, so we have to prevent scrolling completely
                                    var isAtTop = (startY <= curY && el.scrollTop === 0);
                                    var isAtBottom = (startY >= curY && el.scrollHeight - el.scrollTop === height);

                                    // Stop a bounce bug when at the bottom or top of the scrollable element
                                    if (isAtTop || isAtBottom) {
                                        evt.preventDefault();
                                    }

                                    // No need to continue up the DOM, we've done our job
                                    return;
                                }

                                // Test the next parent
                                el = el.parentNode;
                            }

                            // Stop the bouncing -- no parents are scrollable
                            evt.preventDefault();
                        };

                        var handleTouchstart = function(evt) {
                            // Store the first Y position of the touch
                            startY = evt.touches ? evt.touches[0].screenY : evt.screenY;
                        };

                        
                        window.removeEventListener('touchstart', handleTouchstart, false);
                        window.removeEventListener('touchmove', handleTouchmove, false);
                        enabled = false;

                        console.log('touchmove')
                }
            };
        }
    ]);*/


    /**
     * 适配textarea 的高度
     */
    app.directive('adaptTextareaMinheight', [
        function () {
            return {
                restrict: 'A',
                link: function (scope, ele, attr) {
                    ele[0].addEventListener('blur', function (event) {
                        var row = this.value.split("\n").length;
                        this.style.minHeight = attr.adaptTextareaMinheight*row-1+'rem';
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
                                    $('body').removeClass('pt-page-container');
                                });
                        }
                        //退出 且自己是当前页
                        if (!l && $ele.hasClass('pt-page-current')) {
                            $('body').addClass('pt-page-container');
                            $ele.addClass('pt-page-moveToRight')
                                .on('webkitAnimationEnd animationend', function () {
                                    $(this).removeClass('pt-page-moveToRight')
                                        .removeClass('pt-page-current');
                                    $('body').removeClass('pt-page-container');
                                });
                        }
                    });
                }
            };
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
                });
            };

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
            };

            /**
             * 设置默认地址
             */
            addressService.setDefault = function (address, callback) {
                address.IsDefault = true;
                addressService.saveAddress(address, callback);
            };

            addressService.select = {};

            //市级联
            addressService.selectCity = function () {
                //如果未选择省 清空市
                if(addressService.item.ProvinceName){
                    addressService.selectCityObj = [];
                    for (var i in addressService.cityList['0']) {
                        if (addressService.item.ProvinceName == addressService.cityList['0'][i]) {
                            addressService.select.CityNameId = '0,' + i;
                            addressService.selectCityObj = addressService.cityObj['0,' + i];
                        }
                    }
                }else{
                    //重置上次选择
                    addressService.selectCityObj = {};
                    addressService.item.CityName = '选择市';
                    addressService.item.DistrictName = '选择县区';

                }

                //addressService.select.DistrictNameId = undefined;
                addressService.selectDistrictObj = '';
            };

            addressService.areaCity = function () {
                //如果未选择市 清空区
                if(addressService.item.CityName){
                    addressService.selectDistrictObj= [];
                    for (var i in addressService.cityList[addressService.select.CityNameId]) {
                        if (addressService.item.CityName == addressService.cityList[addressService.select.CityNameId][i]) {
                            //addressService.select.DistrictNameId = addressService.select.CityNameId + ',' + i;
                            addressService.selectDistrictObj = addressService.cityObj[addressService.select.CityNameId + ',' + i];
                        }
                    }
                }else{
                    addressService.selectDistrictObj = {};

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

                if (cityListStr) {
                    try {
                        addressService.cityList = JSON.parse(cityListStr);
                        addressService.cityObj = parseCity(addressService.cityList);
                        console.log(addressService.cityObj)
                        cb && cb();
                    }
                    catch (e) {
                        console.log(e);
                        localStorage.removeItem('cityListStr');
                        getCityListJson();
                    }
                }
                else {
                    getCityListJson();
                }

                function getCityListJson() {
                    data4jsonp(jsApiHost + '/api/address/CityListByJson').success(function (ret) {
                        if (ret.Code == 200) {
                            var city = ret.Data.City;
                            addressService.cityList = JSON.parse(city);
                            addressService.cityObj = parseCity(JSON.parse(city));
                            cb && cb();
                            //保存放在主流程之后
                            try {
                                localStorage.setItem('cityListStr', city);
                            }
                            catch (e) {}

                        }
                        else {
                            toast(ret.Msg);
                        }

                    });
                }

                function parseCity(cityObj) {
                    var cityList = {},tempAttr;
                    for (var i in cityObj) {
                        tempAttr = [];
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

            };

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
                                getCityList(function () {
                                    addressService.selectCity();
                                    addressService.areaCity();
                                });
                            }
                        }
                        else {
                            toast(result.Msg);
                        }
                    });
            };

            /**
             * 获得当前用户的地址列表
             */
            addressService.queryAddressList = function (cb) {
                getCityList(function () {
                    //console.log(addressService, '2222')
                });

                /*用户收货地址列表*/
                data4jsonp(jsApiHost + '/api/address/addressList')
                    .success(function (result, code) {
                        var resultAddress;
                        if (result.Code == 200) {
                            if (result.Data && (resultAddress = result.Data.AddressList)) {
                                addressService.list = resultAddress.slice(0, 5);
                                cb && cb(addressService.list);
                            }
                        }
                    });
            };


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

                if (!obj.CityName || obj.CityName === '' || obj.CityName === '选择市'
                    || !obj.DistrictName || obj.DistrictName === '' || obj.DistrictName === '选择县区'
                    || !obj.ProvinceName || obj.ProvinceName === '' || obj.ProvinceName === '选择省份'
                    || !obj.Details || obj.Details === '' || !obj.PostCode || obj.PostCode === '') {
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

                data4jsonp(jsApiHost + '/api/address/' + url, {
                    params: JSON.stringify(obj)
                }).success(function (ret) {
                    if (ret.Code == 200) {
                        cb && cb(ret.Data);
                    }
                    else {
                        toast(ret.Msg);
                    }

                });
            };

            addressService.delAddress = function (aid, cb) {
                ymtUI.comfirm({
                    msg: '是否删除收货地址？'
                }, function () {
                    data4jsonp(jsApiHost + '/api/address/deleteaddress', {
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
                    var $ele = $(ele[0]),
                        top = $ele.offset().top,
                        height = $ele.height(),
                        clsName = ele.overflowFixed;

                    var isNeedfixed = function () {
                        if ($(document).scrollTop() > parseInt(top) + parseInt(height)) {
                            $ele.addClass(clsName);
                        }
                        else {
                            $ele.removeClass(clsName);
                        }
                    };
                    $ele.on('click', function () {
                        var top = $ele.parent().offset().top;
                        $($window).scrollTop(top);
                    });
                    $(document).on('scroll', isNeedfixed);
                }
            };
        }
    ]);

    angular.element(document).ready(function () {
        angular.bootstrap(document.documentElement, ['preOrderApp']);
    });

})(window);
