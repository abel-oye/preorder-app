'use strict';

/*
 * 继承
 * @param 目标对象
 * @param 源目标
 * 现在只实现一个简单对象copy
 */
module.exports.extends = function () {
  var target = arguments[0] || {},
    i = 1,
    length = Object.keys(arguments).length,
    source;
  var src,
    copy;
  if (length === i) {
    target = this;
    --i;
  }
  if (typeof target !== 'object' && typeof target !== 'function') {
    target = {}
  }
  while (i < length) {
    if (source = arguments[i]) {
      for (var name in source) {
        src = target[name];
        copy = source[name];
        if (src === copy) {
          continue;
        }

        if (copy) {
          target[name] = copy
        }

      }
    }
    i++;
  }

  return target;
}
