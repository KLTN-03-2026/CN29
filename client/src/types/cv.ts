export type SectionType =
  | 'objective'
  | 'experience'
  | 'education'
  | 'activity'
  | 'skill'
  | 'certificate'
  | 'project'
  | 'reference';

export type ListSectionType = Exclude<SectionType, 'objective'>;

export interface CVPersonalInfo {
  fullName: string;
  headline: string;
  birthday: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  avatarUrl: string;
}

export interface CVItemBase {
  id: string;
  [key: string]: string | number;
}

export interface ExperienceItem extends CVItemBase {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationItem extends CVItemBase {
  school: string;
  major: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ActivityItem extends CVItemBase {
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface SkillItem extends CVItemBase {
  name: string;
  level: number;
}

export interface CertificateItem extends CVItemBase {
  name: string;
  issuer: string;
  date: string;
}

export interface ProjectItem extends CVItemBase {
  name: string;
  role: string;
  date: string;
  description: string;
}

export interface ReferenceItem extends CVItemBase {
  name: string;
  position: string;
  company: string;
  phone: string;
  email: string;
}

export type CVListItem =
  | ExperienceItem
  | EducationItem
  | ActivityItem
  | SkillItem
  | CertificateItem
  | ProjectItem
  | ReferenceItem;

export interface ObjectiveData {
  content: string;
}

export interface ListSectionData {
  items: CVListItem[];
}

export type CVSectionData = ObjectiveData | ListSectionData;

export interface CVSection {
  id: string;
  type: SectionType;
  title: string;
  collapsed: boolean;
  data: CVSectionData;
}

export type ObjectiveSection = CVSection & {
  type: 'objective';
  data: ObjectiveData;
};

export type ListSection = CVSection & {
  type: ListSectionType;
  data: ListSectionData;
};

export type ExperienceSection = CVSection & {
  type: 'experience';
  data: { items: ExperienceItem[] };
};

export type EducationSection = CVSection & {
  type: 'education';
  data: { items: EducationItem[] };
};

export type ActivitySection = CVSection & {
  type: 'activity';
  data: { items: ActivityItem[] };
};

export type SkillSection = CVSection & {
  type: 'skill';
  data: { items: SkillItem[] };
};

export type CertificateSection = CVSection & {
  type: 'certificate';
  data: { items: CertificateItem[] };
};

export type ProjectSection = CVSection & {
  type: 'project';
  data: { items: ProjectItem[] };
};

export type ReferenceSection = CVSection & {
  type: 'reference';
  data: { items: ReferenceItem[] };
};

export interface CVDocument {
  personalInfo: CVPersonalInfo;
  sections: CVSection[];
}

export interface SectionOption {
  type: SectionType;
  label: string;
  defaultTitle: string;
}

export const SECTION_OPTIONS: SectionOption[] = [
  { type: 'objective', label: 'Mục tiêu nghề nghiệp', defaultTitle: 'MỤC TIÊU NGHỀ NGHIỆP' },
  { type: 'experience', label: 'Kinh nghiệm làm việc', defaultTitle: 'KINH NGHIỆM LÀM VIỆC' },
  { type: 'education', label: 'Học vấn', defaultTitle: 'HỌC VẤN' },
  { type: 'activity', label: 'Hoạt động', defaultTitle: 'HOẠT ĐỘNG' },
  { type: 'skill', label: 'Kỹ năng', defaultTitle: 'KỸ NĂNG' },
  { type: 'certificate', label: 'Chứng chỉ', defaultTitle: 'CHỨNG CHỈ' },
  { type: 'project', label: 'Dự án', defaultTitle: 'DỰ ÁN' },
  { type: 'reference', label: 'Người tham chiếu', defaultTitle: 'NGƯỜI THAM CHIẾU' }
];

export const SECTION_OPTION_BY_TYPE: Record<SectionType, SectionOption> = SECTION_OPTIONS.reduce(
  (result, option) => {
    result[option.type] = option;
    return result;
  },
  {} as Record<SectionType, SectionOption>
);
