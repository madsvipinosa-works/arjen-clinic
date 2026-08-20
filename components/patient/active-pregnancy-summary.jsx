import { createClient } from "@/utils/supabase/server";
import { format, differenceInDays, addDays } from "date-fns";
import { 
  Baby, 
  Heart, 
  Sparkles, 
  ShieldAlert, 
  Calendar,
  CheckCircle2,
  Apple
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Pure JavaScript dictionary mapping gestational weeks (4 to 40) to baby fruit/vegetable size equivalents
const BABY_SIZE_MAP = {
  4: { name: "Poppy Seed", emoji: "🌱", size: "~1 mm", highlight: "Implanting & forming early embryonic structure" },
  5: { name: "Apple Seed", emoji: "🍎", size: "~2-3 mm", highlight: "Neural tube and early heartbeat developing" },
  6: { name: "Sweet Pea", emoji: "🫛", size: "~5-6 mm", highlight: "Blood circulating and facial features beginning" },
  7: { name: "Blueberry", emoji: "🫐", size: "~1 cm", highlight: "Brain generating 100,000 cells per minute" },
  8: { name: "Raspberry", emoji: "🍇", size: "~1.6 cm", highlight: "Tiny webbed fingers and toes emerging" },
  9: { name: "Green Olive", emoji: "🫒", size: "~2.3 cm", highlight: "Muscles forming with subtle initial twitches" },
  10: { name: "Prune", emoji: "🍑", size: "~3 cm", highlight: "Vital organs functional; now called a fetus" },
  11: { name: "Lime", emoji: "🍋", size: "~4 cm", highlight: "Hands opening and closing into tiny fists" },
  12: { name: "Plum", emoji: "🟣", size: "~5.4 cm", highlight: "End of 1st trimester; reflexes active" },
  13: { name: "Peach", emoji: "🍑", size: "~7.4 cm", highlight: "Unique fingerprints permanently forming" },
  14: { name: "Lemon", emoji: "🍋", size: "~8.7 cm", highlight: "Practicing gentle swallowing and breathing" },
  15: { name: "Apple", emoji: "🍎", size: "~10 cm", highlight: "Light sensitivity through closed eyelids" },
  16: { name: "Avocado", emoji: "🥑", size: "~11.5 cm", highlight: "Active kicks, turns, and facial movements" },
  17: { name: "Pomegranate", emoji: "🔴", size: "~13 cm", highlight: "Skeleton hardening into strong bone" },
  18: { name: "Bell Pepper", emoji: "🫑", size: "~14 cm", highlight: "Hearing mother's heartbeat and voice" },
  19: { name: "Mango", emoji: "🥭", size: "~15 cm", highlight: "Protective vernix coating on delicate skin" },
  20: { name: "Banana", emoji: "🍌", size: "~25 cm", highlight: "Halfway mark! Taste buds actively sensing" },
  21: { name: "Carrot", emoji: "🥕", size: "~26.7 cm", highlight: "Bone marrow producing essential blood cells" },
  22: { name: "Papaya", emoji: "🍈", size: "~28 cm", highlight: "Grip and touch reflexes growing stronger" },
  23: { name: "Grapefruit", emoji: "🍊", size: "~29 cm", highlight: "Recognizing rhythmic music and voices" },
  24: { name: "Ear of Corn", emoji: "🌽", size: "~30 cm", highlight: "Lungs developing surfactant and branches" },
  25: { name: "Acorn Squash", emoji: "🌰", size: "~34 cm", highlight: "Establishing regular sleep and wake cycles" },
  26: { name: "Zucchini", emoji: "🥒", size: "~35.5 cm", highlight: "Inhaling and exhaling amniotic fluid" },
  27: { name: "Cauliflower", emoji: "🥦", size: "~36.8 cm", highlight: "Entering 3rd trimester; brain waves active" },
  28: { name: "Eggplant", emoji: "🍆", size: "~37.5 cm", highlight: "Eyelids open and blink to ambient light" },
  29: { name: "Butternut Squash", emoji: "🎃", size: "~38.6 cm", highlight: "Muscles and lungs continuing to mature" },
  30: { name: "Cabbage", emoji: "🥬", size: "~40 cm", highlight: "Brain tissue folding into intricate memory grooves" },
  31: { name: "Coconut", emoji: "🥥", size: "~41 cm", highlight: "Rapid healthy fat layer accumulation" },
  32: { name: "Jicama", emoji: "🥔", size: "~42.4 cm", highlight: "Practicing coordinated breathing and sucking" },
  33: { name: "Pineapple", emoji: "🍍", size: "~43.7 cm", highlight: "Bones firming up; maternal antibodies passing" },
  34: { name: "Cantaloupe", emoji: "🍈", size: "~45 cm", highlight: "Central nervous system fully responsive" },
  35: { name: "Honeydew Melon", emoji: "🍈", size: "~46.2 cm", highlight: "Kidneys and liver functioning completely" },
  36: { name: "Head of Romaine", emoji: "🥬", size: "~47.4 cm", highlight: "Settling into downward birth position" },
  37: { name: "Winter Melon", emoji: "🍉", size: "~48.6 cm", highlight: "Full term milestone officially reached" },
  38: { name: "Leek Bunch", emoji: "🎋", size: "~49.8 cm", highlight: "Firm grasp reflex and healthy lungs" },
  39: { name: "Mini Watermelon", emoji: "🍉", size: "~50.7 cm", highlight: "Ready to greet the world any day now" },
  40: { name: "Small Pumpkin", emoji: "🎃", size: "~51.2 cm", highlight: "Full development complete and ready for birth" }
};

function getBabySizeInfo(weeks) {
  const boundedWeek = Math.max(4, Math.min(40, weeks));
  return BABY_SIZE_MAP[boundedWeek] || BABY_SIZE_MAP[40];
}

export async function ActivePregnancySummary({ patientId }) {
  const supabase = await createClient();

  // Fetch patient profile and active maternal episode in parallel
  const [
    { data: patient },
    { data: activeEpisode }
  ] = await Promise.all([
    supabase.from("patients").select("full_name, is_high_risk, allergies, blood_type").eq("id", patientId).maybeSingle(),
    supabase.from("maternal_episodes").select("*").eq("patient_id", patientId).eq("status", "Active").maybeSingle()
  ]);

  if (!activeEpisode) {
    return (
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/40 border border-secondary text-foreground flex items-center justify-center shadow-inner">
              <Baby className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-foreground tracking-tight">Maternity Journey</h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full">
                  General Care
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                No active pregnancy episode recorded. Your clinic records will sync here upon your first prenatal checkup.
              </p>
            </div>
          </div>
          {patient?.blood_type && (
            <div className="px-3.5 py-1.5 rounded-xl bg-secondary/30 border border-border text-xs font-bold text-foreground">
              Blood Type: <span className="text-primary">{patient.blood_type}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calculate Gestational Age & Milestones
  let weeks = 0;
  let days = 0;
  let totalDays = 0;
  let progressPercent = 0;
  let trimester = "1st Trimester";
  let edcDate = activeEpisode.edc ? new Date(activeEpisode.edc) : null;

  if (activeEpisode.lmp) {
    const lmpDate = new Date(activeEpisode.lmp);
    totalDays = Math.max(0, differenceInDays(new Date(), lmpDate));
    weeks = Math.floor(totalDays / 7);
    days = totalDays % 7;
    progressPercent = Math.min(100, Math.max(0, Math.round((totalDays / 280) * 100)));

    if (!edcDate) {
      edcDate = addDays(lmpDate, 280);
    }

    if (weeks >= 27) {
      trimester = "3rd Trimester (Final Stretch)";
    } else if (weeks >= 13) {
      trimester = "2nd Trimester (Golden Phase)";
    } else {
      trimester = "1st Trimester (Early Development)";
    }
  }

  const daysRemaining = edcDate ? Math.max(0, differenceInDays(edcDate, new Date())) : null;
  const babySize = getBabySizeInfo(weeks);

  return (
    <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground rounded-3xl p-6 sm:p-8 shadow-xl shadow-primary/20 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
        <Heart className="w-64 h-64" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Top Header info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
              <Baby className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                  Active Pregnancy
                </span>
                <span className="text-xs font-bold text-white/80">
                  {trimester}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                Week {weeks} <span className="text-lg font-bold text-white/90">+{days} days</span>
              </h2>
            </div>
          </div>

          {/* Obstetric History / High Risk Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {patient?.is_high_risk && (
              <span className="inline-flex items-center gap-1 bg-white text-destructive font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                <ShieldAlert className="w-3.5 h-3.5" /> High Risk Watch
              </span>
            )}
            {(activeEpisode.gravida || activeEpisode.para) && (
              <span className="bg-white/15 backdrop-blur-md text-white font-black text-[11px] px-3 py-1 rounded-full border border-white/20">
                G{activeEpisode.gravida || 0} P{activeEpisode.para || 0}
              </span>
            )}
            {patient?.blood_type && (
              <span className="bg-white/15 backdrop-blur-md text-white font-bold text-[11px] px-3 py-1 rounded-full border border-white/20">
                Type {patient.blood_type}
              </span>
            )}
          </div>
        </div>

        {/* Baby Size Visual Highlight Card */}
        <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 text-2xl flex items-center justify-center shrink-0 shadow-inner">
              {babySize.emoji}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/75">
                Baby Size Equivalent ({babySize.size})
              </p>
              <h3 className="text-base sm:text-lg font-black text-white">
                Size of a <span className="underline decoration-white/40 underline-offset-4">{babySize.name}</span>
              </h3>
            </div>
          </div>
          <div className="text-xs font-medium text-white/90 sm:text-right max-w-xs leading-relaxed sm:border-l sm:border-white/20 sm:pl-4">
            <span className="font-bold text-white">Milestone: </span>
            {babySize.highlight}
          </div>
        </div>

        {/* Gestational Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-xs font-bold text-white/90">
            <span>Conception</span>
            <span className="font-extrabold text-white">{progressPercent}% Journey Completed</span>
            <span>40 Weeks (EDC)</span>
          </div>

          <div className="w-full bg-black/20 backdrop-blur-md h-3.5 rounded-full p-0.5 border border-white/20 overflow-hidden relative">
            <div 
              className="bg-white h-full rounded-full transition-all duration-1000 shadow-sm"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>

          {/* Trimester Marker Ticks */}
          <div className="flex justify-between text-[10px] text-white/75 font-semibold pt-0.5">
            <span>T1 (W1-12)</span>
            <span>T2 (W13-26)</span>
            <span>T3 (W27-40)</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-[10px] font-black text-white/75 uppercase tracking-wider">Estimated Due Date</p>
            <p className="text-base sm:text-lg font-black text-white mt-1">
              {edcDate ? format(edcDate, "MMM d, yyyy") : "Not set"}
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-[10px] font-black text-white/75 uppercase tracking-wider">Last Menstrual Period</p>
            <p className="text-base sm:text-lg font-black text-white mt-1">
              {activeEpisode.lmp ? format(new Date(activeEpisode.lmp), "MMM d, yyyy") : "Not set"}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <p className="text-[10px] font-black text-white/75 uppercase tracking-wider">Days to Estimated Delivery</p>
            <p className="text-base sm:text-lg font-black text-white mt-1">
              {daysRemaining !== null ? `${daysRemaining} Days` : "Calculating"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivePregnancySkeleton() {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-40 h-6" />
          </div>
        </div>
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
      <Skeleton className="w-full h-14 rounded-2xl" />
      <Skeleton className="w-full h-4 rounded-full" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl col-span-2 sm:col-span-1" />
      </div>
    </div>
  );
}
