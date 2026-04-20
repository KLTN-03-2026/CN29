import { create } from 'zustand';
import {
  SECTION_OPTION_BY_TYPE,
  type CVDocument,
  type CVListItem,
  type CVPersonalInfo,
  type CVSection,
  type ListSection,
  type ListSectionType,
  type ObjectiveSection,
  type SectionType
} from '../types/cv';

const CV_STORAGE_KEY = 'topcv-cv-editor-v1';

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const clampSkillLevel = (value: number) => {
  const normalized = Number.isFinite(value) ? Math.round(value) : 3;
  return Math.min(5, Math.max(1, normalized));
};

const createListItemByType = (type: ListSectionType): CVListItem => {
  switch (type) {
    case 'experience':
      return {
        id: createId(),
        company: 'Công ty TNHH ABC',
        position: 'Nhân viên kinh doanh',
        startDate: '01/2021',
        endDate: 'Hiện tại',
        description: 'Tìm kiếm khách hàng mới, tư vấn giải pháp và đạt doanh số hàng tháng.'
      };
    case 'education':
      return {
        id: createId(),
        school: 'Đại học Kinh tế TP.HCM',
        major: 'Quản trị kinh doanh',
        startDate: '2016',
        endDate: '2020',
        description: 'Tốt nghiệp loại Khá. Đồ án tốt nghiệp về quản trị bán hàng.'
      };
    case 'activity':
      return {
        id: createId(),
        organization: 'CLB Tình nguyện Xanh',
        role: 'Thành viên',
        startDate: '2018',
        endDate: '2020',
        description: 'Tổ chức sự kiện gây quỹ và các hoạt động cộng đồng.'
      };
    case 'skill':
      return {
        id: createId(),
        name: 'Giao tiếp và đàm phán',
        level: 4
      };
    case 'certificate':
      return {
        id: createId(),
        name: 'TOEIC 750',
        issuer: 'IIG Việt Nam',
        date: '2023'
      };
    case 'project':
      return {
        id: createId(),
        name: 'Dự án mở rộng kênh B2B',
        role: 'Trưởng nhóm kinh doanh',
        date: '2024',
        description: 'Xây dựng quy trình tiếp cận 150 doanh nghiệp và ký mới 18 hợp đồng.'
      };
    case 'reference':
      return {
        id: createId(),
        name: 'Trần Thị A',
        position: 'Giám đốc kinh doanh',
        company: 'Công ty TNHH ABC',
        phone: '0901234567',
        email: 'tranthia@abc.vn'
      };
    default:
      return {
        id: createId(),
        name: '',
        level: 3
      };
  }
};

const createSection = (type: SectionType): CVSection => {
  const option = SECTION_OPTION_BY_TYPE[type];

  if (type === 'objective') {
    return {
      id: createId(),
      type,
      title: option.defaultTitle,
      collapsed: false,
      data: {
        content:
          '<p>Với hơn 3 năm kinh nghiệm ở vị trí Nhân viên kinh doanh, tôi mong muốn tiếp tục phát triển năng lực tư vấn và chăm sóc khách hàng doanh nghiệp, đồng thời đóng góp vào mục tiêu tăng trưởng doanh thu bền vững của công ty.</p>'
      }
    };
  }

  return {
    id: createId(),
    type,
    title: option.defaultTitle,
    collapsed: false,
    data: {
      items: [createListItemByType(type)]
    }
  } as ListSection;
};

const initialPersonalInfo: CVPersonalInfo = {
  fullName: 'Nguyễn Trung Dũng',
  headline: 'Nhân viên kinh doanh',
  birthday: '18/12/1997',
  gender: 'Nam',
  phone: '0123 456 789',
  email: 'ntdungpk123@gmail.com',
  address: 'Quận 4, thành phố Hồ Chí Minh',
  website: 'facebook.com/TopCV.vn',
  avatarUrl: ''
};

const initialSections: CVSection[] = [
  createSection('objective'),
  createSection('education'),
  createSection('activity'),
  createSection('experience'),
  createSection('skill')
];

const isListSection = (section: CVSection): section is ListSection => section.type !== 'objective';

const hydrateListItems = (type: ListSectionType, rawItems: unknown): CVListItem[] => {
  if (!Array.isArray(rawItems)) {
    return [createListItemByType(type)];
  }

  const mapped = rawItems
    .map((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object') {
        return createListItemByType(type);
      }

      const defaultItem = createListItemByType(type) as Record<string, unknown>;
      const record = rawItem as Record<string, unknown>;
      const next = { ...defaultItem };

      Object.keys(defaultItem).forEach((key) => {
        if (key === 'id') return;
        const incoming = record[key];
        if (typeof incoming === 'string' || typeof incoming === 'number') {
          next[key] = incoming;
        }
      });

      if (typeof record.id === 'string' && record.id.trim()) {
        next.id = record.id;
      }

      if (type === 'skill') {
        next.level = clampSkillLevel(Number(next.level));
      }

      return next as CVListItem;
    })
    .filter(Boolean);

  return mapped.length > 0 ? mapped : [createListItemByType(type)];
};

const hydrateSection = (rawSection: unknown): CVSection | null => {
  if (!rawSection || typeof rawSection !== 'object') {
    return null;
  }

  const record = rawSection as Record<string, unknown>;
  const type = record.type as SectionType;

  if (!type || !(type in SECTION_OPTION_BY_TYPE)) {
    return null;
  }

  const fallback = createSection(type);

  if (type === 'objective') {
    const fallbackObjective = fallback as ObjectiveSection;
    const rawData = record.data as Record<string, unknown> | undefined;
    const content = typeof rawData?.content === 'string' ? rawData.content : fallbackObjective.data.content;

    return {
      ...fallbackObjective,
      id: typeof record.id === 'string' && record.id ? record.id : fallback.id,
      title: typeof record.title === 'string' && record.title ? record.title : fallback.title,
      collapsed: Boolean(record.collapsed),
      data: { content }
    } as ObjectiveSection;
  }

  const rawData = record.data as Record<string, unknown> | undefined;
  const items = hydrateListItems(type, rawData?.items);

  return {
    ...fallback,
    id: typeof record.id === 'string' && record.id ? record.id : fallback.id,
    title: typeof record.title === 'string' && record.title ? record.title : fallback.title,
    collapsed: Boolean(record.collapsed),
    data: { items }
  } as ListSection;
};

interface CVStoreState {
  personalInfo: CVPersonalInfo;
  sections: CVSection[];
  setPersonalField: (field: keyof CVPersonalInfo, value: string) => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  toggleSectionCollapsed: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: 'up' | 'down') => void;
  reorderSections: (activeId: string, overId: string) => void;
  addSection: (type: SectionType) => void;
  removeSection: (sectionId: string) => void;
  updateObjectiveContent: (sectionId: string, content: string) => void;
  addListItem: (sectionId: string) => void;
  updateListItemField: (sectionId: string, itemId: string, field: string, value: string | number) => void;
  removeListItem: (sectionId: string, itemId: string) => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  getCVData: () => CVDocument;
  resetToInitial: () => void;
}

export const useCVStore = create<CVStoreState>((set, get) => ({
  personalInfo: initialPersonalInfo,
  sections: initialSections,

  setPersonalField: (field, value) => {
    set((state) => ({
      personalInfo: {
        ...state.personalInfo,
        [field]: value
      }
    }));
  },

  updateSectionTitle: (sectionId, title) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              title
            }
          : section
      )
    }));
  },

  toggleSectionCollapsed: (sectionId) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              collapsed: !section.collapsed
            }
          : section
      )
    }));
  },

  moveSection: (sectionId, direction) => {
    set((state) => {
      const index = state.sections.findIndex((section) => section.id === sectionId);
      if (index < 0) return state;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.sections.length) return state;

      const next = [...state.sections];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

      return { sections: next };
    });
  },

  reorderSections: (activeId, overId) => {
    if (!activeId || !overId || activeId === overId) return;

    set((state) => {
      const oldIndex = state.sections.findIndex((section) => section.id === activeId);
      const newIndex = state.sections.findIndex((section) => section.id === overId);

      if (oldIndex < 0 || newIndex < 0) return state;

      const next = [...state.sections];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);

      return { sections: next };
    });
  },

  addSection: (type) => {
    set((state) => ({
      sections: [...state.sections, createSection(type)]
    }));
  },

  removeSection: (sectionId) => {
    set((state) => ({
      sections: state.sections.filter((section) => section.id !== sectionId)
    }));
  },

  updateObjectiveContent: (sectionId, content) => {
    set((state) => ({
      sections: state.sections.map((section) => {
        if (section.id !== sectionId || section.type !== 'objective') {
          return section;
        }

        return {
          ...section,
          data: {
            content
          }
        };
      })
    }));
  },

  addListItem: (sectionId) => {
    set((state) => ({
      sections: state.sections.map((section) => {
        if (!isListSection(section) || section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          data: {
            items: [...section.data.items, createListItemByType(section.type)]
          }
        };
      })
    }));
  },

  updateListItemField: (sectionId, itemId, field, value) => {
    set((state) => ({
      sections: state.sections.map((section) => {
        if (!isListSection(section) || section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          data: {
            items: section.data.items.map((item) => {
              if (item.id !== itemId) {
                return item;
              }

              const record = item as Record<string, unknown>;
              const currentValue = record[field];

              let nextValue: string | number = value;
              if (typeof currentValue === 'number') {
                nextValue = Number(value);
              }

              if (section.type === 'skill' && field === 'level') {
                nextValue = clampSkillLevel(Number(value));
              }

              return {
                ...record,
                [field]: nextValue
              } as CVListItem;
            })
          }
        };
      })
    }));
  },

  removeListItem: (sectionId, itemId) => {
    set((state) => ({
      sections: state.sections.map((section) => {
        if (!isListSection(section) || section.id !== sectionId) {
          return section;
        }

        const remainingItems = section.data.items.filter((item) => item.id !== itemId);

        return {
          ...section,
          data: {
            items: remainingItems.length > 0 ? remainingItems : [createListItemByType(section.type)]
          }
        };
      })
    }));
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;

    const payload = get().getCVData();
    window.localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(payload));
  },

  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(CV_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<CVDocument>;
      const nextPersonalInfo: CVPersonalInfo = {
        ...initialPersonalInfo,
        ...(parsed.personalInfo || {})
      };

      const nextSections = Array.isArray(parsed.sections)
        ? parsed.sections.map(hydrateSection).filter(Boolean) as CVSection[]
        : [];

      set({
        personalInfo: nextPersonalInfo,
        sections: nextSections.length > 0 ? nextSections : initialSections
      });
    } catch {
      // Ignore malformed storage payload and keep default data.
    }
  },

  getCVData: () => {
    const state = get();
    return {
      personalInfo: state.personalInfo,
      sections: state.sections
    };
  },

  resetToInitial: () => {
    set({
      personalInfo: initialPersonalInfo,
      sections: initialSections.map((section) => hydrateSection(section) || section)
    });
  }
}));

export { CV_STORAGE_KEY };
