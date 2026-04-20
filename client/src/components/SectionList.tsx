import React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2
} from 'lucide-react';
import { useCVStore } from '../store/useCVStore';
import type {
  ActivityItem,
  ActivitySection,
  CVSection,
  CertificateItem,
  CertificateSection,
  EducationItem,
  EducationSection,
  ExperienceItem,
  ExperienceSection,
  ListSection,
  ProjectItem,
  ProjectSection,
  ReferenceItem,
  ReferenceSection,
  SkillItem,
  SkillSection
} from '../types/cv';

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const textAreaClassName = `${inputClassName} min-h-[90px] resize-y leading-6`;

const cardButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

const sectionTitleInputClassName =
  'w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-700 outline-none transition focus:border-blue-200 focus:bg-white';

const itemCardClassName = 'rounded-lg border border-slate-200 bg-slate-50 p-3';

const isListSection = (section: CVSection): section is ListSection => section.type !== 'objective';

const SortableSectionCard: React.FC<{ section: CVSection; index: number; total: number }> = ({ section, index, total }) => {
  const updateSectionTitle = useCVStore((state) => state.updateSectionTitle);
  const toggleSectionCollapsed = useCVStore((state) => state.toggleSectionCollapsed);
  const moveSection = useCVStore((state) => state.moveSection);
  const removeSection = useCVStore((state) => state.removeSection);
  const updateObjectiveContent = useCVStore((state) => state.updateObjectiveContent);
  const addListItem = useCVStore((state) => state.addListItem);
  const updateListItemField = useCVStore((state) => state.updateListItemField);
  const removeListItem = useCVStore((state) => state.removeListItem);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const transformedClass = transform || transition ? 'will-change-transform' : '';

  const renderExperienceItem = (item: ExperienceItem) => (
    <div key={item.id} className={itemCardClassName}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kinh nghiệm</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
          title="Xóa mục"
          aria-label="Xóa mục"
          onClick={() => removeListItem(section.id, item.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className={inputClassName}
          value={item.company}
          onChange={(event) => updateListItemField(section.id, item.id, 'company', event.target.value)}
          placeholder="Công ty"
        />
        <input
          className={inputClassName}
          value={item.position}
          onChange={(event) => updateListItemField(section.id, item.id, 'position', event.target.value)}
          placeholder="Chức danh"
        />
        <input
          className={inputClassName}
          value={item.startDate}
          onChange={(event) => updateListItemField(section.id, item.id, 'startDate', event.target.value)}
          placeholder="Bắt đầu"
        />
        <input
          className={inputClassName}
          value={item.endDate}
          onChange={(event) => updateListItemField(section.id, item.id, 'endDate', event.target.value)}
          placeholder="Kết thúc"
        />
      </div>
      <textarea
        className={`${textAreaClassName} mt-2`}
        value={item.description}
        onChange={(event) => updateListItemField(section.id, item.id, 'description', event.target.value)}
        placeholder="Mô tả chi tiết"
      />
    </div>
  );

  const renderEducationItem = (item: EducationItem) => (
    <div key={item.id} className={itemCardClassName}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Học vấn</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
          title="Xóa mục"
          aria-label="Xóa mục"
          onClick={() => removeListItem(section.id, item.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className={inputClassName}
          value={item.school}
          onChange={(event) => updateListItemField(section.id, item.id, 'school', event.target.value)}
          placeholder="Trường"
        />
        <input
          className={inputClassName}
          value={item.major}
          onChange={(event) => updateListItemField(section.id, item.id, 'major', event.target.value)}
          placeholder="Ngành học"
        />
        <input
          className={inputClassName}
          value={item.startDate}
          onChange={(event) => updateListItemField(section.id, item.id, 'startDate', event.target.value)}
          placeholder="Bắt đầu"
        />
        <input
          className={inputClassName}
          value={item.endDate}
          onChange={(event) => updateListItemField(section.id, item.id, 'endDate', event.target.value)}
          placeholder="Kết thúc"
        />
      </div>
      <textarea
        className={`${textAreaClassName} mt-2`}
        value={item.description}
        onChange={(event) => updateListItemField(section.id, item.id, 'description', event.target.value)}
        placeholder="Mô tả thành tích học tập"
      />
    </div>
  );

  const renderActivityItem = (item: ActivityItem) => (
    <div key={item.id} className={itemCardClassName}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoạt động</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
          title="Xóa mục"
          aria-label="Xóa mục"
          onClick={() => removeListItem(section.id, item.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className={inputClassName}
          value={item.organization}
          onChange={(event) => updateListItemField(section.id, item.id, 'organization', event.target.value)}
          placeholder="Tổ chức"
        />
        <input
          className={inputClassName}
          value={item.role}
          onChange={(event) => updateListItemField(section.id, item.id, 'role', event.target.value)}
          placeholder="Vai trò"
        />
        <input
          className={inputClassName}
          value={item.startDate}
          onChange={(event) => updateListItemField(section.id, item.id, 'startDate', event.target.value)}
          placeholder="Bắt đầu"
        />
        <input
          className={inputClassName}
          value={item.endDate}
          onChange={(event) => updateListItemField(section.id, item.id, 'endDate', event.target.value)}
          placeholder="Kết thúc"
        />
      </div>
      <textarea
        className={`${textAreaClassName} mt-2`}
        value={item.description}
        onChange={(event) => updateListItemField(section.id, item.id, 'description', event.target.value)}
        placeholder="Mô tả đóng góp"
      />
    </div>
  );

  const renderSkillItem = (item: SkillItem) => (
    <div key={item.id} className={itemCardClassName}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kỹ năng</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
          title="Xóa mục"
          aria-label="Xóa mục"
          onClick={() => removeListItem(section.id, item.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <input
        className={inputClassName}
        value={item.name}
        onChange={(event) => updateListItemField(section.id, item.id, 'name', event.target.value)}
        placeholder="Tên kỹ năng"
      />
      <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Mức độ</span>
          <span>{item.level}/5</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          className="w-full accent-blue-500"
          title="Mức độ kỹ năng"
          aria-label="Mức độ kỹ năng"
          value={item.level}
          onChange={(event) => updateListItemField(section.id, item.id, 'level', Number(event.target.value))}
        />
      </div>
    </div>
  );

  const renderCertificateItem = (item: CertificateItem) => (
    <div key={item.id} className={itemCardClassName}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chứng chỉ</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
          title="Xóa mục"
          aria-label="Xóa mục"
          onClick={() => removeListItem(section.id, item.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className={inputClassName}
          value={item.name}
          onChange={(event) => updateListItemField(section.id, item.id, 'name', event.target.value)}
          placeholder="Tên chứng chỉ"
        />
        <input
          className={inputClassName}
          value={item.issuer}
          onChange={(event) => updateListItemField(section.id, item.id, 'issuer', event.target.value)}
          placeholder="Đơn vị cấp"
        />
      </div>
      <input
        className={`${inputClassName} mt-2`}
        value={item.date}
        onChange={(event) => updateListItemField(section.id, item.id, 'date', event.target.value)}
        placeholder="Thời gian"
      />
    </div>
  );

  const renderProjectItem = (item: ProjectItem) => (
    <div key={item.id} className={itemCardClassName}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dự án</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
          title="Xóa mục"
          aria-label="Xóa mục"
          onClick={() => removeListItem(section.id, item.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className={inputClassName}
          value={item.name}
          onChange={(event) => updateListItemField(section.id, item.id, 'name', event.target.value)}
          placeholder="Tên dự án"
        />
        <input
          className={inputClassName}
          value={item.role}
          onChange={(event) => updateListItemField(section.id, item.id, 'role', event.target.value)}
          placeholder="Vai trò"
        />
      </div>
      <input
        className={`${inputClassName} mt-2`}
        value={item.date}
        onChange={(event) => updateListItemField(section.id, item.id, 'date', event.target.value)}
        placeholder="Thời gian"
      />
      <textarea
        className={`${textAreaClassName} mt-2`}
        value={item.description}
        onChange={(event) => updateListItemField(section.id, item.id, 'description', event.target.value)}
        placeholder="Mô tả kết quả dự án"
      />
    </div>
  );

  const renderReferenceItem = (item: ReferenceItem) => (
    <div key={item.id} className={itemCardClassName}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Người tham chiếu</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
          title="Xóa mục"
          aria-label="Xóa mục"
          onClick={() => removeListItem(section.id, item.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          className={inputClassName}
          value={item.name}
          onChange={(event) => updateListItemField(section.id, item.id, 'name', event.target.value)}
          placeholder="Họ tên"
        />
        <input
          className={inputClassName}
          value={item.position}
          onChange={(event) => updateListItemField(section.id, item.id, 'position', event.target.value)}
          placeholder="Chức danh"
        />
        <input
          className={inputClassName}
          value={item.company}
          onChange={(event) => updateListItemField(section.id, item.id, 'company', event.target.value)}
          placeholder="Công ty"
        />
        <input
          className={inputClassName}
          value={item.phone}
          onChange={(event) => updateListItemField(section.id, item.id, 'phone', event.target.value)}
          placeholder="Số điện thoại"
        />
      </div>
      <input
        className={`${inputClassName} mt-2`}
        value={item.email}
        onChange={(event) => updateListItemField(section.id, item.id, 'email', event.target.value)}
        placeholder="Email"
      />
    </div>
  );

  const renderListSectionItems = (targetSection: ListSection) => {
    switch (targetSection.type) {
      case 'experience':
        return targetSection.data.items.map((item) => renderExperienceItem(item as ExperienceItem));
      case 'education':
        return targetSection.data.items.map((item) => renderEducationItem(item as EducationItem));
      case 'activity':
        return targetSection.data.items.map((item) => renderActivityItem(item as ActivityItem));
      case 'skill':
        return targetSection.data.items.map((item) => renderSkillItem(item as SkillItem));
      case 'certificate':
        return targetSection.data.items.map((item) => renderCertificateItem(item as CertificateItem));
      case 'project':
        return targetSection.data.items.map((item) => renderProjectItem(item as ProjectItem));
      case 'reference':
        return targetSection.data.items.map((item) => renderReferenceItem(item as ReferenceItem));
      default:
        return null;
    }
  };

  return (
    <article
      ref={setNodeRef}
      className={`rounded-xl border border-slate-200 bg-white ${transformedClass} ${isDragging ? 'opacity-70 shadow-lg' : 'shadow-sm'}`}
    >
      <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
          {...attributes}
          {...listeners}
          title="Kéo thả"
        >
          <GripVertical size={15} />
        </button>

        <input
          className={sectionTitleInputClassName}
          value={section.title}
          onChange={(event) => updateSectionTitle(section.id, event.target.value)}
          placeholder="Tiêu đề mục"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cardButtonClassName}
            onClick={() => moveSection(section.id, 'up')}
            disabled={index === 0}
            title="Đưa lên"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            className={cardButtonClassName}
            onClick={() => moveSection(section.id, 'down')}
            disabled={index === total - 1}
            title="Đưa xuống"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-500 transition hover:bg-red-50"
            onClick={() => removeSection(section.id)}
            title="Xóa"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            className={cardButtonClassName}
            onClick={() => toggleSectionCollapsed(section.id)}
            title={section.collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {section.collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </header>

      {!section.collapsed && (
        <div className="space-y-3 p-3">
          {section.type === 'objective' && (
            <div
              className="min-h-[110px] rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              contentEditable
              suppressContentEditableWarning
              onInput={(event) => updateObjectiveContent(section.id, event.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: (section.data as { content: string }).content }}
            />
          )}

          {isListSection(section) && (
            <>
              <div className="space-y-3">{renderListSectionItems(section)}</div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                onClick={() => addListItem(section.id)}
              >
                <Plus size={15} />
                Thêm mục
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
};

const SectionList: React.FC = () => {
  const personalInfo = useCVStore((state) => state.personalInfo);
  const setPersonalField = useCVStore((state) => state.setPersonalField);
  const sections = useCVStore((state) => state.sections);
  const reorderSections = useCVStore((state) => state.reorderSections);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderSections(String(active.id), String(over.id));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-50 px-3 py-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Thông tin cơ bản</h3>
        </header>

        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
          <input
            className={inputClassName}
            value={personalInfo.fullName}
            onChange={(event) => setPersonalField('fullName', event.target.value)}
            placeholder="Họ và tên"
          />
          <input
            className={inputClassName}
            value={personalInfo.headline}
            onChange={(event) => setPersonalField('headline', event.target.value)}
            placeholder="Vị trí ứng tuyển"
          />
          <input
            className={inputClassName}
            value={personalInfo.birthday}
            onChange={(event) => setPersonalField('birthday', event.target.value)}
            placeholder="Ngày sinh"
          />
          <input
            className={inputClassName}
            value={personalInfo.gender}
            onChange={(event) => setPersonalField('gender', event.target.value)}
            placeholder="Giới tính"
          />
          <input
            className={inputClassName}
            value={personalInfo.phone}
            onChange={(event) => setPersonalField('phone', event.target.value)}
            placeholder="Số điện thoại"
          />
          <input
            className={inputClassName}
            value={personalInfo.email}
            onChange={(event) => setPersonalField('email', event.target.value)}
            placeholder="Email"
          />
          <input
            className={inputClassName}
            value={personalInfo.address}
            onChange={(event) => setPersonalField('address', event.target.value)}
            placeholder="Địa chỉ"
          />
          <input
            className={inputClassName}
            value={personalInfo.website}
            onChange={(event) => setPersonalField('website', event.target.value)}
            placeholder="Website"
          />
          <input
            className={`${inputClassName} md:col-span-2`}
            value={personalInfo.avatarUrl}
            onChange={(event) => setPersonalField('avatarUrl', event.target.value)}
            placeholder="Avatar URL"
          />
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sections.map((section, index) => (
              <SortableSectionCard key={section.id} section={section} index={index} total={sections.length} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SectionList;
