import { SteamMaFile } from '@/lib/steam-utils';
import fs from 'fs';
import path from 'path';

// 账号类型
export interface Account {
  id: string;
  accountName: string;
  steamId?: string;
  data: SteamMaFile;
  lastUsed: number;
  addedAt: number;
}

// 账号组类型
export interface AccountGroup {
  id: string;
  name: string;
  accounts: Account[];
  adminToken: string;
  createdAt: number;
}

// 内存存储账号组
// 注意：实际生产环境应使用数据库存储
const accountGroups: Record<string, AccountGroup> = {};

// 存储文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

// 初始化数据目录
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating data directory:', error);
}

// 从文件加载数据
function loadAccountsFromFile(): void {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      const parsedData = JSON.parse(data);

      // 将解析的数据合并到内存中
      Object.assign(accountGroups, parsedData);
      console.log(`Loaded ${Object.keys(parsedData).length} account groups from file`);
    }
  } catch (error) {
    console.error('Error loading accounts from file:', error);
  }
}

// 保存数据到文件
function saveAccountsToFile(): void {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountGroups, null, 2));
  } catch (error) {
    console.error('Error saving accounts to file:', error);
  }
}

// 添加账号组
function addAccountGroup(group: AccountGroup): void {
  accountGroups[group.id] = group;
  saveAccountsToFile();
}

// 更新账号组
function updateAccountGroup(groupId: string, group: Partial<AccountGroup>): boolean {
  if (!accountGroups[groupId]) return false;

  accountGroups[groupId] = { ...accountGroups[groupId], ...group };
  saveAccountsToFile();
  return true;
}

// 删除账号组
function deleteAccountGroup(groupId: string): boolean {
  if (!accountGroups[groupId]) return false;

  delete accountGroups[groupId];
  saveAccountsToFile();
  return true;
}

// 获取账号组
function getAccountGroup(groupId: string): AccountGroup | null {
  return accountGroups[groupId] || null;
}

// 添加账号到组
function addAccountToGroup(groupId: string, account: Account): boolean {
  if (!accountGroups[groupId]) return false;

  accountGroups[groupId].accounts.push(account);
  saveAccountsToFile();
  return true;
}

// 获取所有账号组
function getAllAccountGroups(): Record<string, AccountGroup> {
  return { ...accountGroups };
}

// 保证启动时加载数据
loadAccountsFromFile();

// 存储模块对象
const store = {
  accountGroups,
  addAccountGroup,
  updateAccountGroup,
  deleteAccountGroup,
  getAccountGroup,
  addAccountToGroup,
  getAllAccountGroups,
  saveAccountsToFile
};

// 导出存储对象
export default store;
