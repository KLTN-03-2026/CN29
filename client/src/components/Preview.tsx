import React from 'react';
import { CalendarDays, Link2, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { useCVStore } from '../store/useCVStore';
import type {
  ActivityItem,
  CVSection,
  CertificateItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ReferenceItem,
  SkillItem
} from '../types/cv';

interface PreviewProps {
  containerRef?: React.RefObject<HTMLDivElement>;
}

const renderObjective = (content: string) => {
  return (
    <div
      className="text-[15px] leading-7 text-slate-700 [&_p]:mb-2"
      dangerouslySetInnerHTML={{ __html: content || '<p>Nhập mục tiêu nghề nghiệp tại đây...</p>' }}
    />
  );
};

const renderExperience = (items: ExperienceItem[]) => (
  <div className="space-y-4">
    {items.map((item) => (
      <div key={item.id} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 text-[14px]">
        <div className="font-semibold text-slate-500">{`${item.startDate} - ${item.endDate}`}</div>
        <div>
          <p className="font-semibold uppercase text-slate-800">{item.company}</p>
          <p className="font-medium text-slate-700">{item.position}</p>
          <p className="mt-1 whitespace-pre-line leading-6 text-slate-600">{item.description}</p>
        </div>
      </div>
    ))}
  </div>
);

const renderEducation = (items: EducationItem[]) => (
  <div className="space-y-4">
    {items.map((item) => (
      <div key={item.id} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 text-[14px]">
        <div className="font-semibold text-slate-500">{`${item.startDate} - ${item.endDate}`}</div>
        <div>
          <p className="font-semibold uppercase text-slate-800">{item.school}</p>
          <p className="font-medium text-slate-700">{item.major}</p>
          <p className="mt-1 whitespace-pre-line leading-6 text-slate-600">{item.description}</p>
        </div>
      </div>
    ))}
  </div>
);

const renderActivity = (items: ActivityItem[]) => (
  <div className="space-y-4">
    {items.map((item) => (
      <div key={item.id} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 text-[14px]">
        <div className="font-semibold text-slate-500">{`${item.startDate} - ${item.endDate}`}</div>
        <div>
          <p className="font-semibold uppercase text-slate-800">{item.organization}</p>
          <p className="font-medium text-slate-700">{item.role}</p>
          <p className="mt-1 whitespace-pre-line leading-6 text-slate-600">{item.description}</p>
        </div>
      </div>
    ))}
  </div>
);

const renderSkill = (items: SkillItem[]) => (
  <div className="space-y-3">
    {items.map((item) => {
      const level = Math.max(1, Math.min(5, Math.round(Number(item.level) || 1)));
      return (
        <div key={item.id} className="space-y-1.5">
          <div className="flex items-center justify-between text-[14px]">
            <span className="font-semibold text-slate-700">{item.name}</span>
            <span className="text-slate-500">{item.level}/5</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={`${item.id}-${index}`}
                className={`h-2.5 rounded-full ${index < level ? 'bg-blue-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

const renderCertificate = (items: CertificateItem[]) => (
  <div className="space-y-3 text-[14px]">
    {items.map((item) => (
      <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5">
        <div>
          <p className="font-semibold text-slate-800">{item.name}</p>
          <p className="text-slate-600">{item.issuer}</p>
        </div>
        <div className="font-medium text-slate-500">{item.date}</div>
      </div>
    ))}
  </div>
);

const renderProject = (items: ProjectItem[]) => (
  <div className="space-y-4 text-[14px]">
    {items.map((item) => (
      <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-3">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="font-semibold uppercase text-slate-800">{item.name}</p>
          <span className="text-slate-500">{item.date}</span>
        </div>
        <p className="mb-1.5 font-medium text-slate-700">{item.role}</p>
        <p className="whitespace-pre-line leading-6 text-slate-600">{item.description}</p>
      </div>
    ))}
  </div>
);

const renderReference = (items: ReferenceItem[]) => (
  <div className="space-y-3 text-[14px]">
    {items.map((item) => (
      <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-3">
        <p className="font-semibold text-slate-800">{item.name}</p>
        <p className="text-slate-700">{item.position} - {item.company}</p>
        <div className="mt-1.5 grid grid-cols-1 gap-1 text-slate-600 sm:grid-cols-2">
          <span>{item.phone}</span>
          <span>{item.email}</span>
        </div>
      </div>
    ))}
  </div>
);

const renderSectionBody = (section: CVSection) => {
  if (section.type === 'objective') {
    return renderObjective((section.data as { content: string }).content);
  }

  const items = (section.data as { items: unknown[] }).items || [];

  switch (section.type) {
    case 'experience':
      return renderExperience(items as ExperienceItem[]);
    case 'education':
      return renderEducation(items as EducationItem[]);
    case 'activity':
      return renderActivity(items as ActivityItem[]);
    case 'skill':
      return renderSkill(items as SkillItem[]);
    case 'certificate':
      return renderCertificate(items as CertificateItem[]);
    case 'project':
      return renderProject(items as ProjectItem[]);
    case 'reference':
      return renderReference(items as ReferenceItem[]);
    default:
      return null;
  }
};

const Preview: React.FC<PreviewProps> = ({ containerRef }) => {
  const personalInfo = useCVStore((state) => state.personalInfo);
  const sections = useCVStore((state) => state.sections);

  return (
    <div className="mx-auto w-full max-w-[860px] overflow-auto rounded-2xl bg-slate-200 p-6" ref={containerRef}>
      <article id="cv-preview-paper" className="mx-auto min-h-[1123px] w-[794px] bg-white shadow-[0_24px_44px_rgba(15,23,42,0.18)]">
        <header className="flex gap-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-500 px-10 py-8 text-white">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white/80 bg-white/30">
            {personalInfo.avatarUrl ? (
              <img src={personalInfo.avatarUrl} alt={personalInfo.fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/90">
                <UserRound size={56} strokeWidth={1.6} />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1 className="truncate text-[42px] font-extrabold leading-tight tracking-tight">{personalInfo.fullName}</h1>
            <p className="mt-1 text-[24px] font-semibold text-blue-50">{personalInfo.headline}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-blue-50/95">
              <div className="flex items-center gap-1.5"><CalendarDays size={14} /> {personalInfo.birthday}</div>
              <div className="flex items-center gap-1.5"><Phone size={14} /> {personalInfo.phone}</div>
              <div className="flex items-center gap-1.5"><UserRound size={14} /> {personalInfo.gender}</div>
              <div className="flex items-center gap-1.5"><Mail size={14} /> {personalInfo.email}</div>
              <div className="flex items-center gap-1.5"><MapPin size={14} /> {personalInfo.address}</div>
              <div className="flex items-center gap-1.5"><Link2 size={14} /> {personalInfo.website}</div>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-10 py-8">
          {sections.map((section) => (
            <section key={section.id} className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
                <h2 className="text-[26px] font-extrabold tracking-wide text-slate-800">{section.title}</h2>
              </div>
              <div className="px-4 py-3.5">{renderSectionBody(section)}</div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
};

export default Preview;
