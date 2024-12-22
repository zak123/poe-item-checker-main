'use client';

interface LeagueSelectorProps {
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
}

export default function LeagueSelector({ selectedLeague, onLeagueChange }: LeagueSelectorProps) {
  return (
    <div>
      <label htmlFor="league" className="text-sm select-none">
        League
      </label>
      <select
        id="league"
        value={selectedLeague}
        onChange={(e) => onLeagueChange(e.target.value)}
        className="bg-slate-900/90 border border-white/10 rounded-lg px-3 py-1.5 text-sm
                 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                 transition-all duration-200"
      >
        <option value="Standard">Standard</option>
      </select>
    </div>
  );
} 
