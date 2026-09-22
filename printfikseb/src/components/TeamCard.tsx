import Image from 'next/image';
import type { TeamMember } from '@/lib/types';

function initialer(navn: string) {
  return navn
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((d) => d[0]?.toUpperCase())
    .join('');
}

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="group h-full rounded-3xl border border-ink-100 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift">
      <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700">
        {member.avatar_url ? (
          <Image
            src={member.avatar_url}
            alt={member.name}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
            {initialer(member.name)}
          </span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold">{member.name}</h3>
      {member.role && <p className="mt-0.5 text-sm font-semibold text-brand-700">{member.role}</p>}
      {member.bio && <p className="mt-3 text-sm leading-relaxed text-ink-600">{member.bio}</p>}
    </div>
  );
}
