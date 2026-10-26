/**
 * 多维表格 schema——cdkit feishu:init 按这里一键建表 / 补列，不再每届手工加列、漏选项。
 * 列名即后端读写的字段名，改名请同步修改 mapping。
 *
 * 状态语义（重要，和 2026 秋不同）：
 *   「通过」只是评审决定，不会触发任何邮件；
 *   邮件只在后台发信台审批批次后发送，发送成功由系统写「已通知」。
 */
import { MACHINES, type EventConfig } from '@cdkit/core';

// 飞书字段类型常量
export const FT = { text: 1, number: 2, select: 3, multi: 4, date: 5, checkbox: 7, phone: 13, url: 15, attachment: 17 } as const;

export interface FieldDef {
  field_name: string;
  type: number;
  property?: Record<string, unknown>;
  /** 仅文档用途 */
  note?: string;
}

export interface TableDef {
  key: keyof EventConfig['feishu']['tables'];
  name: string;
  fields: FieldDef[];
}

const select = (name: string, options: string[], note?: string): FieldDef => ({
  field_name: name,
  type: FT.select,
  property: { options: options.map((o) => ({ name: o })) },
  note,
});
const text = (name: string, note?: string): FieldDef => ({ field_name: name, type: FT.text, note });
const num = (name: string, note?: string): FieldDef => ({ field_name: name, type: FT.number, property: { formatter: '0' }, note });
const check = (name: string, note?: string): FieldDef => ({ field_name: name, type: FT.checkbox, note });

/** 状态选项直接取自状态机（packages/core/src/lifecycle.ts），表结构与流转规则不会各改各的 */
export const CFP_STATUS = MACHINES.cfp.states;

export function tableDefs(ev: EventConfig): TableDef[] {
  const tracks = ev.tracks.map((t) => t.id);
  const formats = ev.formats.map((f) => f.label);
  return [
    {
      key: 'cfp',
      name: '投稿',
      fields: [
        text('议题'), text('姓名'), text('邮箱'), { field_name: '手机号', type: FT.phone }, text('公司'), text('职位'),
        select('赛道', tracks), select('形式', formats.length ? formats : ['深度分享']), text('摘要'), text('简介'),
        select('难度等级', ['100', '200', '300', '400']), text('社区身份'), text('来源渠道', 'utm_source，统计合作社区引流'),
        select('状态', [...CFP_STATUS], '「通过」不会自动发信'), text('状态备注', '撤销 / 婉拒理由，系统追加写入'),
        ...ev.review.reviewers.map((r) => num(`评分-${r}`)), num('总分'),
        text('AI 摘要', 'cdkit ai review-cfp 写入'), select('AI 建议赛道', tracks), text('AI 风险提示'), text('AI 重复/相似'),
        text('照片', 'CDN URL，材料页写入'), text('照片审核'), text('PPT 初稿'), text('PPT 终稿'), text('PPT 审核'),
        text('PPT 公开版', '活动后提交的可公开版本'), select('公开授权', ['公开 PPT', '不公开'], '活动后讲者在材料页选择'),
        text('备注'),
      ],
    },
    {
      key: 'speakers',
      name: '嘉宾',
      fields: [
        text('ID', 'slug / 投稿 recordId'), text('姓名'), text('英文名'), text('公司'), text('职位'), text('议题'), text('简介'),
        text('英文公司'), text('英文职位'), text('英文议题'), text('英文简介'), text('照片'), text('社交链接'),
        select('赛道', tracks), text('联合讲者', '多人合讲：填其他讲者 ID，逗号分隔（2026 秋三人合讲照片显示 bug 的根因）'),
        check('主推'), check('展示', '勾选才上官网'), text('海报', '批量生成后回写'),
        text('照片焦点', 'AI 返回的人脸中心 x,y（0–1），海报按此裁剪'),
        text('公开 PPT', '讲者授权公开后由材料页写入，官网回顾页展示'), text('视频', '回放链接'),
      ],
    },
    {
      key: 'agenda',
      name: '议程',
      fields: [
        text('标题'), text('开始', 'HH:MM'), text('结束', 'HH:MM'), select('会场', ev.venue.rooms.map((r) => r.id)),
        select('赛道', [...tracks, 'break', 'social']), select('类型', ['KEYNOTE', 'SESSION', 'LIGHTNING', 'WORKSHOP', 'PANEL', 'BREAK', 'SOCIAL']),
        text('讲者', '嘉宾 ID，逗号分隔'), text('主持人'), check('展示'),
      ],
    },
    {
      key: 'sponsors',
      name: '赞助与合作',
      fields: [
        text('公司'), text('名称', '官网展示名，空则用公司'), text('联系人'), text('邮箱'), { field_name: '手机号', type: FT.phone },
        select('意向档位', ev.sponsors.tiers.map((t) => t.name)), select('档位', ev.sponsors.tiers.map((t) => t.name), '合同确认后的档位，决定官网排序'),
        select('状态', [...MACHINES.sponsor.states]), text('状态备注'),
        { field_name: '权益', type: FT.multi, property: { options: ['展位', '演讲席位', '礼品赞助', '宣发合作', '推文 logo'].map((name) => ({ name })) } },
        text('Logo', '矢量/高清源文件 URL'), text('Logo 预览', 'Web 用 PNG/SVG'), text('官网'), text('展位号'), text('礼品清单'), text('专属二维码渠道'),
        check('展示'), text('备注'),
      ],
    },
    {
      key: 'volunteers',
      name: '志愿者',
      fields: [
        text('姓名'), text('邮箱'), { field_name: '手机号', type: FT.phone }, select('意向岗位', ['签到引导组', '会场执行组', '直播技术组', '摄影记录组', '嘉宾接待组', '物料后勤组']),
        select('英文能力', ['可工作沟通', '日常交流', '不需要']), { field_name: '可服务时段', type: FT.multi, property: { options: ['搭建日', '上午', '下午', 'After Party'].map((name) => ({ name })) } },
        select('状态', [...MACHINES.volunteer.states]), text('状态备注'), text('分配岗位'), text('排班'), text('备注'),
      ],
    },
    {
      key: 'todos',
      name: '待办',
      fields: [
        text('事项'), text('负责人'), text('截止'), select('状态', ['未开始', '进行中', '已完成', '已取消']),
        text('来源', '会议名 + 日期'), text('原文'), select('优先级', ['P0', 'P1', 'P2']),
      ],
    },
    {
      key: 'plan',
      name: '项目总表',
      fields: [
        text('事项'), text('截止日期'), text('倒计时'), text('阶段'), select('类型', ['milestone', 'tweet', 'design', 'ops']),
        text('角色'), text('负责人'), text('说明'), text('自动化'), select('状态', ['未开始', '进行中', '已完成']), text('ID'),
      ],
    },
  ];
}
