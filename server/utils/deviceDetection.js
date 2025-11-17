// src/utils/deviceDetection.js
// 设备检测和响应式工具函数

/**
 * 获取当前设备类型
 * @returns {'mobile' | 'tablet' | 'desktop' | 'widescreen'}
 */
export const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'desktop';
  return 'widescreen';
};

/**
 * 检测是否为移动设备
 * @returns {boolean}
 */
export const isMobileDevice = () => {
  const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  return userAgent || window.innerWidth < 768;
};

/**
 * 检测是否为桌面设备
 * @returns {boolean}
 */
export const isDesktopDevice = () => {
  return window.innerWidth >= 1024 && !isMobileDevice();
};

/**
 * 检测是否为平板设备
 * @returns {boolean}
 */
export const isTabletDevice = () => {
  const width = window.innerWidth;
  return width >= 768 && width < 1024;
};

/**
 * 检测是否为宽屏设备
 * @returns {boolean}
 */
export const isWidescreenDevice = () => {
  return window.innerWidth >= 1440;
};

/**
 * 获取响应式值
 * @param {Object} values - 不同断点的值 {mobile, tablet, desktop, widescreen}
 * @returns {*} 当前断点对应的值
 */
export const getResponsiveValue = (values) => {
  const width = window.innerWidth;
  const { mobile, tablet, desktop, widescreen } = values;
  
  if (width < 768) return mobile;
  if (width < 1024) return tablet || mobile;
  if (width < 1440) return desktop || tablet || mobile;
  return widescreen || desktop || tablet || mobile;
};

/**
 * 获取响应式字体大小
 * @param {number} mobile - 移动端字体大小
 * @param {number} tablet - 平板字体大小
 * @param {number} desktop - 桌面字体大小
 * @param {number} widescreen - 宽屏字体大小
 * @returns {number} 当前设备对应的字体大小
 */
export const getResponsiveFontSize = (mobile, tablet, desktop, widescreen) => {
  return getResponsiveValue({ mobile, tablet, desktop, widescreen });
};

/**
 * 获取响应式间距
 * @param {Object} spacing - 不同断点的间距
 * @returns {number} 当前设备对应的间距
 */
export const getResponsiveSpacing = (spacing) => {
  return getResponsiveValue(spacing);
};

/**
 * 断点常量
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  widescreen: 1920,
};

/**
 * 媒体查询辅助函数
 * @param {string} breakpoint - 断点名称
 * @returns {boolean} 是否匹配该断点
 */
export const matchBreakpoint = (breakpoint) => {
  const width = window.innerWidth;
  
  switch (breakpoint) {
    case 'mobile':
      return width < BREAKPOINTS.mobile;
    case 'tablet':
      return width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
    case 'desktop':
      return width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
    case 'widescreen':
      return width >= BREAKPOINTS.desktop;
    default:
      return false;
  }
};

/**
 * 创建响应式样式对象
 * @param {Object} styles - 不同断点的样式对象
 * @returns {Object} 当前设备对应的样式
 */
export const createResponsiveStyles = (styles) => {
  const deviceType = getDeviceType();
  return styles[deviceType] || styles.mobile || {};
};

export default {
  getDeviceType,
  isMobileDevice,
  isDesktopDevice,
  isTabletDevice,
  isWidescreenDevice,
  getResponsiveValue,
  getResponsiveFontSize,
  getResponsiveSpacing,
  BREAKPOINTS,
  matchBreakpoint,
  createResponsiveStyles,
};
