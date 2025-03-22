import SteamTotp from 'steam-totp';

// Steam maFile 数据类型
export interface SteamMaFile {
  shared_secret?: string;
  identity_secret?: string;
  secret_1?: string;
  account_name?: string;
  device_id?: string;
  steamid?: string;
  serial_number?: string;
  revocation_code?: string;
  uri?: string;
  server_time?: number;
  token_gid?: string;
  fully_enrolled?: boolean;
  Session?: {
    SessionID?: string;
    SteamID?: string;
    SteamLoginSecure?: string;
    WebCookie?: string;
    OAuthToken?: string;
    SteamID_64?: string;
  }
}

// Steam TOTP工具类
export class SteamUtils {
  /**
   * 解析 maFile 文件内容
   * @param fileContent - maFile 文件内容（JSON字符串或对象）
   * @returns 解析后的 maFile 数据
   */
  static parseMaFile(fileContent: string | object): SteamMaFile {
    try {
      // 如果输入是字符串，尝试解析为JSON
      let data: any;
      if (typeof fileContent === 'string') {
        data = JSON.parse(fileContent);
      } else {
        // 如果已经是对象，直接使用
        data = fileContent;
      }

      // 检查解析结果是否有效
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid maFile data format');
      }

      return {
        shared_secret: data.shared_secret,
        identity_secret: data.identity_secret,
        secret_1: data.secret_1,
        account_name: data.account_name,
        device_id: data.device_id,
        steamid: data.Session?.SteamID || data.steamid,
        serial_number: data.serial_number,
        revocation_code: data.revocation_code,
        uri: data.uri,
        server_time: data.server_time,
        token_gid: data.token_gid,
        fully_enrolled: data.fully_enrolled,
        Session: data.Session
      };
    } catch (error) {
      console.error('Error parsing maFile:', error);
      throw new Error('Invalid maFile format');
    }
  }

  /**
   * 验证 maFile 数据的有效性
   * @param data - maFile 数据
   * @returns 是否有效的 maFile 数据
   */
  static validateMaFile(data: SteamMaFile): boolean {
    // 至少需要有 shared_secret 才能生成验证码
    return !!data.shared_secret;
  }

  /**
   * 生成Steam认证码
   * @param sharedSecret - Steam共享密钥
   * @param timeOffset - 时间偏移量（秒）
   * @returns 生成的5位TOTP码
   */
  static generateAuthCode(sharedSecret: string, timeOffset: number = 0): string {
    try {
      return SteamTotp.generateAuthCode(sharedSecret, timeOffset);
    } catch (error) {
      console.error('Error generating auth code:', error);
      throw new Error('Invalid shared_secret format');
    }
  }

  /**
   * 异步获取Steam认证码，同时考虑Steam服务器的时间偏移
   * @param sharedSecret - Steam共享密钥
   * @returns Promise包含生成的TOTP码和时间偏移量
   */
  static getAuthCodeWithServerTime(sharedSecret: string): Promise<{ code: string, offset: number, latency: number }> {
    return new Promise((resolve, reject) => {
      try {
        SteamTotp.getAuthCode(sharedSecret, undefined, (err, code, offset, latency) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ code, offset, latency });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 生成交易确认密钥
   * @param identitySecret - Steam身份密钥
   * @param time - 时间戳（秒）
   * @param tag - 确认类型标签
   * @returns 生成的确认密钥
   */
  static generateConfirmationKey(identitySecret: string, time: number, tag: string): string {
    try {
      return SteamTotp.generateConfirmationKey(identitySecret, time, tag);
    } catch (error) {
      console.error('Error generating confirmation key:', error);
      throw new Error('Invalid identity_secret format');
    }
  }

  /**
   * 生成设备ID
   * @param steamId - SteamID
   * @returns 生成的设备ID
   */
  static getDeviceID(steamId: string): string {
    try {
      return SteamTotp.getDeviceID(steamId);
    } catch (error) {
      console.error('Error generating device ID:', error);
      throw new Error('Invalid steamid format');
    }
  }

  /**
   * 获取Steam服务器的时间偏移量
   * @returns Promise包含时间偏移量（秒）和延迟（毫秒）
   */
  static getTimeOffset(): Promise<{ offset: number, latency: number }> {
    return new Promise((resolve, reject) => {
      try {
        SteamTotp.getTimeOffset((err, offset, latency) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ offset, latency });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取当前的Steam时间（考虑偏移量）
   * @param timeOffset - 时间偏移量（秒）
   * @returns 当前的Steam时间（秒）
   */
  static getSteamTime(timeOffset: number = 0): number {
    return Math.floor(Date.now() / 1000) + timeOffset;
  }

  /**
   * 验证密钥格式（简单检查）
   * @param secret - 待验证的密钥
   * @returns 是否为有效的base64格式
   */
  static validateSecretFormat(secret: string): boolean {
    // 简单检查base64格式
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(secret);
  }
}

// 导出常用的确认标签类型
export enum ConfirmationTag {
  Conf = 'conf',      // 加载确认页
  Details = 'details', // 加载详情
  Allow = 'allow',    // 确认交易
  Cancel = 'cancel'   // 取消交易
}
