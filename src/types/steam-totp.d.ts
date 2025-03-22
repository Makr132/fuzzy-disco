declare module 'steam-totp' {
  /**
   * 生成TOTP验证码
   * @param secret - Steam共享密钥
   * @param timeOffset - 与Steam时间的偏移（秒）
   * @param callback - 可选的回调函数
   */
  export function generateAuthCode(
    secret: string,
    timeOffset?: number,
    callback?: (error: Error | null, code: string, offset: number, latency: number) => void
  ): string;

  /**
   * 生成TOTP验证码的别名
   * @param secret - Steam共享密钥
   * @param timeOffset - 与Steam时间的偏移（秒）
   * @param callback - 可选的回调函数
   */
  export function getAuthCode(
    secret: string,
    timeOffset?: number,
    callback?: (error: Error | null, code: string, offset: number, latency: number) => void
  ): string;

  /**
   * 生成确认密钥
   * @param identitySecret - Steam身份密钥
   * @param time - 当前时间戳（秒）
   * @param tag - 确认类型标签
   */
  export function generateConfirmationKey(
    identitySecret: string,
    time: number,
    tag: string
  ): string;

  /**
   * 获取设备ID
   * @param steamID - SteamID
   */
  export function getDeviceID(steamID: string | { toString(): string }): string;

  /**
   * 获取Steam时间偏移
   * @param callback - 回调函数
   */
  export function getTimeOffset(
    callback: (error: Error | null, offset: number, latency: number) => void
  ): void;

  /**
   * 获取当前时间戳
   * @param timeOffset - 与Steam时间的偏移（秒）
   * @returns 当前时间戳（秒）
   */
  export function time(timeOffset?: number): number;
}
