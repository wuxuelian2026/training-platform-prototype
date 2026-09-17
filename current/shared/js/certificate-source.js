// CR-2026-028：证书文件来源的唯一映射与查重口径。
//
// 文件来源（file_source_type）回答“这份文件是谁放进系统的”，与审核结果
// （待审核／已通过／已驳回／已撤销）是两个维度，不得混用同一套取值。
// 后台列表、教师端“我的证书”与两个录入入口共用本文件，避免两端文案分叉。
const SOURCE_LABELS = {
  admin_upload: '学校录入',
  后台录入: '学校录入',
  学校录入: '学校录入',
  teacher_upload: '本人上传',
  教师端上传: '本人上传',
  本人上传: '本人上传',
  system_generated: '系统生成',
  系统生成: '系统生成'
};

export const certificateSourceLabel = (value) => SOURCE_LABELS[String(value || '').trim()] || '—';

// 存储态仍保留旧枚举（后台录入／教师端上传），对外展示统一走 certificateSourceLabel。
export const CERTIFICATE_SOURCE_OPTIONS = ['学校录入', '本人上传', '系统生成'];

// 唯一性口径：同一教师下“证书类型 + 证书编号”同时相同即视为重复。
// 编号比较忽略大小写与首尾空白，避免 WD-2019-0028 与 wd-2019-0028 绕过防重。
export const certificateDedupKey = (certificate) => {
  const type = String(certificate?.type || '').trim();
  const number = String(certificate?.number || '').trim().toUpperCase();
  return type && number ? `${type}::${number}` : '';
};

export function findDuplicateCertificate(certificates, candidate, excludeId = '') {
  const key = certificateDedupKey(candidate);
  if (!key) return null;
  return (certificates || []).find((item) => item.id !== excludeId && certificateDedupKey(item) === key) || null;
}
