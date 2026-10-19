<template>
  <div class="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-8 overflow-hidden select-none">
    
    <!-- MIDJOURNEY AESTHETIC: Autonomous Animated ASCII Fluid Canvas -->
    <canvas
      ref="asciiCanvas"
      class="fixed inset-0 w-full h-full pointer-events-none opacity-90 dark:opacity-95 transition-opacity duration-1000 z-0"
    ></canvas>

    <!-- Ambient Vignette & Gradient Overlays (Dark Mode Only — completely hidden in light theme) -->
    <div class="fixed inset-0 pointer-events-none hidden dark:block bg-gradient-to-b from-transparent via-transparent to-black/90 z-1"></div>
    <div class="fixed inset-0 pointer-events-none hidden dark:block bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)] z-1"></div>

    <!-- Top Terminal Meta Bar (Midjourney HUD Style) -->
    <div class="relative z-10 w-full max-w-md mb-4 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-black/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
      <div class="flex items-center space-x-2">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-bold tracking-wider text-slate-800 dark:text-slate-200">KEDR_CORE // SYS.ONLINE</span>
      </div>
      <div class="flex items-center space-x-3 text-[10px]">
        <span class="hidden sm:inline opacity-70">AUTH_SHA256</span>
        <span class="text-orange-600 dark:text-[#fcb4d5] font-bold">[ 5 ЦЕХОВ ]</span>
      </div>
    </div>

    <!-- Central Authentication Capsule (Midjourney Translucent Brutalist Glass) -->
    <div class="relative z-10 max-w-md w-full rounded-3xl p-6 sm:p-8 bg-white/85 dark:bg-[#07070B]/85 backdrop-blur-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl transition-all duration-300">
      
      <!-- Terminal Header -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 dark:bg-[#fcb4d5]/10 text-orange-600 dark:text-[#fcb4d5] text-[10px] font-mono font-bold tracking-wider mb-2.5">
          <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
          <span>СМС СГТУ // AUTH</span>
        </div>

        <h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-mono">
          Вход в терминал
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
          Единая координационная платформа медиацентра
        </p>
      </div>

      <!-- Error Alert with Sci-Fi Terminal Style -->
      <transition name="fade">
        <div
          v-if="errorMsg"
          class="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-start space-x-2.5 shadow-sm"
        >
          <svg class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="leading-relaxed">
            <span class="font-bold">[ОШИБКА АВТОРИЗАЦИИ]</span>
            <div>{{ errorMsg }}</div>
          </div>
        </div>
      </transition>

      <!-- Terminal Authentication Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        
        <!-- Username Field -->
        <div>
          <label class="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>&gt; ИМЯ_ПОЛЬЗОВАТЕЛЯ:</span>
            <span class="text-[10px] text-slate-400 font-normal">логин</span>
          </label>
          <div class="relative">
            <input
              v-model="username"
              type="text"
              required
              autocomplete="username"
              placeholder="admin"
              class="w-full text-xs font-mono px-4 py-3 rounded-2xl border border-black/15 dark:border-white/10 bg-slate-50/80 dark:bg-[#101017]/90 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#fcb4d5]/20 transition-all shadow-inner"
            />
            <span class="absolute right-3.5 top-3 text-[11px] font-mono text-slate-400 dark:text-slate-600 pointer-events-none">_</span>
          </div>
        </div>

        <!-- Password Field with Show/Hide Toggle -->
        <div>
          <label class="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>&gt; ПАРОЛЬ_ДОСТУПА:</span>
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="text-[10px] font-mono text-orange-600 dark:text-[#fcb4d5] hover:underline focus:outline-none cursor-pointer"
            >
              [{{ showPassword ? 'СКРЫТЬ' : 'ПОКАЗАТЬ' }}]
            </button>
          </label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full text-xs font-mono px-4 py-3 rounded-2xl border border-black/15 dark:border-white/10 bg-slate-50/80 dark:bg-[#101017]/90 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#fcb4d5]/20 transition-all shadow-inner"
            />
          </div>
        </div>

        <!-- High-Contrast Action Button (Brand Orange in Light Mode, Stark Midjourney White in Dark Mode) -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full group mt-3 py-3.5 px-5 rounded-2xl text-xs font-mono font-black tracking-wider uppercase bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/25 dark:bg-white dark:hover:bg-[#fcb4d5] dark:text-slate-950 dark:shadow-none border border-transparent transition-all duration-200 flex items-center justify-center space-x-2.5 active:scale-[0.985] disabled:opacity-50 cursor-pointer"
        >
          <span v-if="!loading" class="group-hover:translate-x-0.5 transition-transform">[ ВОЙТИ В СИСТЕМУ → ]</span>
          <span v-else class="flex items-center space-x-2">
            <span class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            <span>АВТОРИЗАЦИЯ...</span>
          </span>
        </button>

      </form>

      <!-- Bottom Secondary Navigation -->
      <div class="mt-6 pt-5 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 gap-2">
        <div>
          <span>Новый участник?</span>
          <router-link
            to="/register"
            class="text-orange-600 dark:text-[#fcb4d5] hover:underline font-bold ml-1.5 inline-flex items-center space-x-1"
          >
            <span>[ Подать заявку ]</span>
          </router-link>
        </div>

        <div class="text-[10px] text-slate-400 dark:text-slate-500">
          СГТУ им. Гагарина Ю.А.
        </div>
      </div>

    </div>

    <!-- Bottom ASCII Footer Ticker -->
    <div class="relative z-10 mt-6 text-[10px] font-mono text-slate-400 dark:text-slate-500 tracking-wider text-center max-w-md w-full flex items-center justify-center space-x-4 opacity-75">
      <span>● ФОТО</span>
      <span>● ДИЗАЙН</span>
      <span>● ВИДЕО</span>
      <span>● МОУШЕН</span>
      <span>● СММ</span>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const { login } = useAuthStore();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref('');

const handleLogin = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    await login(username.value, password.value);
    router.push('/content-plan');
  } catch (err) {
    errorMsg.value = err.message || 'Неверный логин или пароль';
  } finally {
    loading.value = false;
  }
};

// --------------------------------------------------------------------------
// MIDJOURNEY AUTONOMOUS IRIDESCENT FLUID WAVE ENGINE
// High-DPI, Silk Topographic Ribbons, Chromatic Shimmer & Generative Scintillation
// Zero mouse dependency — 100% autonomous hypnotic fluid dynamics
// --------------------------------------------------------------------------
const asciiCanvas = ref(null);
let animationFrameId = null;

// Character glyph pools categorized by optical density and tech aesthetic (Dark Mode)
const GLYPHS_PEAK = ['✦', '✧', '◈', '◇', '▲', '1', '0', 'X', 'Z', 'K', 'E', 'D', 'R', '*', '#', '%'];
const GLYPHS_HIGH = ['+', '=', '~', '/', '\\', '§', '8', '3', '7', 'a', 'm', 'w', 'v'];
const GLYPHS_MID  = [':', ';', '|', '!', 'i', 'r', 'c', 's', 'o', '°'];
const GLYPHS_LOW  = ['·', '.', '~', '^', ':', ','];

// Refined architectural glyph pools for Light Mode (clean, airy, zero ink-blot clumping)
const GLYPHS_LIGHT_PEAK = ['+', '×', '•', '·', 'o', 'x', '1', '0', '~'];
const GLYPHS_LIGHT_HIGH = ['·', ':', '+', '~', '-', '=', '·'];
const GLYPHS_LIGHT_MID  = ['·', ':', '~', '.', '·'];
const GLYPHS_LIGHT_LOW  = ['·', '.'];

onMounted(() => {
  const canvas = asciiCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  const charWidth = 9.5;
  const charHeight = 14;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(width / charWidth);
    rows = Math.ceil(height / charHeight);
  };

  resize();
  window.addEventListener('resize', resize);

  let time = 0;

  // Pre-allocated bucket batches for state-change-free 60FPS rendering
  const BUCKET_COUNT = 8;
  const buckets = Array.from({ length: BUCKET_COUNT }, () => []);

  const render = () => {
    time += 0.012; // Gentle, silky drift speed
    const isDark = document.documentElement.classList.contains('dark');

    // Clear bucket arrays
    for (let i = 0; i < BUCKET_COUNT; i++) {
      buckets[i].length = 0;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.font = '500 10px "JetBrains Mono", "SF Mono", "Fira Code", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const cx = cols * 0.5;
    const cy = rows * 0.5;
    const t = time * 0.45;

    for (let r = 0; r < rows; r++) {
      const ny = r / rows;
      const y = (r + 0.5) * charHeight;

      for (let c = 0; c < cols; c++) {
        const nx = c / cols;
        const x = (c + 0.5) * charWidth;

        // Diagonal rotated space for natural perspective flow
        const rx = nx * 3.4 - ny * 1.6;
        const ry = nx * 1.6 + ny * 3.4;

        // Multi-frequency harmonic interference
        const h1 = Math.sin(rx * 2.8 + t * 0.95 + Math.sin(ry * 2.0 - t * 0.65));
        const h2 = Math.cos(ry * 3.2 - t * 0.85 + Math.cos(rx * 2.2 + t * 0.45));
        const h3 = Math.sin((rx + ry) * 1.9 - t * 1.25);
        const distCenter = Math.hypot(nx - 0.5, ny - 0.5);
        const h4 = Math.sin(distCenter * 5.2 - t * 1.35);

        // Combined fluid field
        const field = h1 * 0.42 + h2 * 0.36 + h3 * 0.14 + h4 * 0.08;

        // Concentric topological ribbon harmonics (creates the flowing contour ripples)
        const ripple1 = Math.sin(field * 9.5 + t * 1.85);
        const ripple2 = Math.cos(field * 14.5 - t * 1.3 + nx * 2.4);

        // Exponential sharpening for crisp shimmering crests with soft valleys
        const crest1 = Math.pow(Math.max(0, (ripple1 + 1) * 0.5), 2.6);
        const crest2 = Math.pow(Math.max(0, (ripple2 + 1) * 0.5), 3.2);
        let intensity = Math.min(1, Math.max(0, crest1 * 0.62 + crest2 * 0.48));

        // Deep negative space threshold — keeps background clean & airy
        if (intensity < 0.14) continue;

        // Deterministic generative micro-twinkle (characters mutate subtly on wave crests)
        const charSeed = Math.floor(
          Math.abs(Math.sin(c * 12.9898 + r * 78.233 + Math.floor(t * 3.2) * 0.1) * 43758.5453)
        );

        // Chromatic shimmer phase (rotates color continuously through the spectrum)
        const shimmerPhase = field * 4.2 + t * 1.6 + nx * 3.0 + ny * 1.5;
        const shimmerVal = Math.sin(shimmerPhase);

        let char = '·';
        let bucketIdx = 0;

        if (isDark) {
          // DARK THEME GLYPH SELECTION
          if (intensity > 0.82) {
            char = GLYPHS_PEAK[charSeed % GLYPHS_PEAK.length];
            bucketIdx = 7;
          } else if (intensity > 0.62) {
            char = GLYPHS_HIGH[charSeed % GLYPHS_HIGH.length];
            if (shimmerVal > 0.28) {
              bucketIdx = 6; // Iridescent Rose Quartz
            } else if (shimmerVal < -0.28) {
              bucketIdx = 5; // Celestial Electric Cyan
            } else {
              bucketIdx = 4; // Ethereal Lavender / Pure Silver
            }
          } else if (intensity > 0.38) {
            char = GLYPHS_MID[charSeed % GLYPHS_MID.length];
            bucketIdx = 3;
          } else if (intensity > 0.24) {
            char = GLYPHS_LOW[charSeed % GLYPHS_LOW.length];
            bucketIdx = 2;
          } else {
            char = '·';
            bucketIdx = 1;
          }
        } else {
          // LIGHT THEME GLYPH SELECTION (Airy, elegant, no harsh ink blobs)
          if (intensity > 0.82) {
            char = GLYPHS_LIGHT_PEAK[charSeed % GLYPHS_LIGHT_PEAK.length];
            bucketIdx = 7;
          } else if (intensity > 0.62) {
            char = GLYPHS_LIGHT_HIGH[charSeed % GLYPHS_LIGHT_HIGH.length];
            if (shimmerVal > 0.22) {
              bucketIdx = 6; // Soft warm cedar amber
            } else if (shimmerVal < -0.22) {
              bucketIdx = 5; // Soft indigo violet
            } else {
              bucketIdx = 4; // Refined slate contour
            }
          } else if (intensity > 0.38) {
            char = GLYPHS_LIGHT_MID[charSeed % GLYPHS_LIGHT_MID.length];
            bucketIdx = 3;
          } else if (intensity > 0.24) {
            char = GLYPHS_LIGHT_LOW[charSeed % GLYPHS_LIGHT_LOW.length];
            bucketIdx = 2;
          } else {
            char = '·';
            bucketIdx = 1;
          }
        }

        // Push to bucket batch: [x, y, char]
        buckets[bucketIdx].push(x, y, char);
      }
    }

    // High-performance bucketed render pass (only 8 state changes per frame)
    if (isDark) {
      // MIDJOURNEY DARK MODE: Pitch Obsidian Abyss with Iridescent Shimmer
      const STYLES_DARK = [
        'transparent',
        'rgba(148, 163, 184, 0.14)', // 1: Cosmic dust
        'rgba(148, 163, 184, 0.30)', // 2: Soft slope
        'rgba(203, 213, 225, 0.52)', // 3: Silver wave body
        'rgba(221, 214, 254, 0.78)', // 4: Luminous Lilac / Lavender
        'rgba(56, 189, 248, 0.90)',  // 5: Celestial Electric Cyan
        'rgba(244, 114, 182, 0.92)', // 6: Iridescent Rose Quartz
        'rgba(255, 255, 255, 0.98)'  // 7: Peak Diamond Starlight
      ];

      for (let b = 1; b < BUCKET_COUNT; b++) {
        const batch = buckets[b];
        if (batch.length === 0) continue;
        ctx.fillStyle = STYLES_DARK[b];
        for (let i = 0; i < batch.length; i += 3) {
          ctx.fillText(batch[i + 2], batch[i], batch[i + 1]);
        }
      }
    } else {
      // LIGHT MODE: Subtle, elegant, harmonious slate-stone wave with gentle warm cedar crest
      const STYLES_LIGHT = [
        'transparent',
        'rgba(148, 163, 184, 0.20)', // 1: Ambient micro-dust
        'rgba(148, 163, 184, 0.36)', // 2: Soft lower slope
        'rgba(100, 116, 139, 0.50)', // 3: Flowing wave body
        'rgba(71, 85, 105, 0.65)',   // 4: Primary contour ribbon
        'rgba(99, 102, 241, 0.50)',  // 5: Crest shimmer A (soft lilac-indigo)
        'rgba(217, 119, 6, 0.55)',   // 6: Crest shimmer B (warm cedar amber)
        'rgba(30, 41, 59, 0.76)'     // 7: Peak crest (refined graphite slate)
      ];

      for (let b = 1; b < BUCKET_COUNT; b++) {
        const batch = buckets[b];
        if (batch.length === 0) continue;
        ctx.fillStyle = STYLES_LIGHT[b];
        for (let i = 0; i < batch.length; i += 3) {
          ctx.fillText(batch[i + 2], batch[i], batch[i + 1]);
        }
      }
    }

    animationFrameId = requestAnimationFrame(render);
  };

  render();

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize);
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
