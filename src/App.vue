<template>
  <div class="min-h-screen flex flex-col transition-colors duration-200">
    <!-- Navbar (Desktop top + Mobile bottom) -->
    <Navbar />

    <!-- Global Midjourney Autonomous Iridescent Fluid Wave Canvas (Entire Site) -->
    <canvas
      ref="asciiCanvas"
      class="fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-700 z-0 will-change-transform transform-gpu"
      :class="isAuthPage ? 'opacity-95 dark:opacity-95' : 'opacity-65 dark:opacity-45'"
      style="contain: strict; transform: translateZ(0);"
    ></canvas>

    <!-- Dark Mode Deep Ambient Scrim (Weakened by 10% on app, rolled back on login page) -->
    <div v-if="!isAuthPage" class="fixed inset-0 pointer-events-none hidden dark:block bg-[#08090C]/65 z-0 transition-opacity duration-500"></div>
    <div v-if="!isAuthPage" class="fixed inset-0 pointer-events-none hidden dark:block bg-gradient-to-b from-[#08090C]/40 via-[#08090C]/60 to-[#08090C]/80 z-0 transition-opacity duration-500"></div>

    <!-- Light Mode Ambient Scrim (Weakened by 10% on app, rolled back on login page) -->
    <div v-if="!isAuthPage" class="fixed inset-0 pointer-events-none block dark:hidden bg-[#F8FAFC]/60 z-0 transition-opacity duration-500"></div>
    <div v-if="!isAuthPage" class="fixed inset-0 pointer-events-none block dark:hidden bg-gradient-to-b from-white/20 via-white/45 to-white/65 z-0 transition-opacity duration-500"></div>

    <!-- Ambient Glass Lighting Orbs (Fixed background refraction for Liquid Glass) -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-orange-400/10 dark:bg-[#fcb4d5]/10 blur-3xl"></div>
      <div class="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full bg-amber-400/8 dark:bg-purple-600/10 blur-3xl"></div>
      <div class="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-orange-300/10 dark:bg-[#fcb4d5]/8 blur-3xl"></div>
    </div>

    <!-- Main Content Area with safe mobile bottom margin -->
    <main class="flex-1 pb-24 md:pb-8 relative z-10 overflow-x-hidden">
      <router-view v-slot="{ Component, route }">
        <transition name="page-swipe" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <!-- Online Drawer -->
    <OnlineDrawer />

    <!-- Global Floating Notification Toast -->
    <transition name="toast">
      <div
        v-if="notification"
        class="fixed bottom-20 md:bottom-6 right-4 md:right-6 left-4 md:left-auto z-50 max-w-sm p-4 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-3 border backdrop-blur-xl"
        :class="getToastClasses(notification.type)"
      >
        <span class="flex-shrink-0">
          <svg v-if="notification.type === 'error'" class="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <svg v-else-if="notification.type === 'warning'" class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <svg v-else-if="notification.type === 'info'" class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <svg v-else class="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <span class="leading-relaxed">{{ notification.message }}</span>
      </div>
    </transition>

    <!-- Footer (Hidden on mobile when nav bar is present, visible on desktop) -->
    <footer class="mt-auto py-6 border-t border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#07070a] text-center text-xs text-slate-500 dark:text-slate-400 hidden md:block transition-colors">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-slate-700 dark:text-slate-300">Медиацентр «СМС СГТУ»</span>
          <span>•</span>
          <span class="text-slate-500 dark:text-slate-400">Фото • Дизайн • Видео • Моушен • СММ • Звук</span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-600 font-mono">
          VUE 3 + Express + SQLite WAL + Bots • 2026
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import OnlineDrawer from './components/OnlineDrawer.vue';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';

const route = useRoute();
const isAuthPage = computed(() => {
  return route?.path === '/login' || route?.path === '/register';
});

const { notification, fetchMe, heartbeat } = useAuthStore();
const { initTheme } = useThemeStore();
let heartbeatInterval = null;

// --------------------------------------------------------------------------
// GLOBAL MIDJOURNEY AUTONOMOUS IRIDESCENT FLUID WAVE ENGINE
// High-DPI, Silk Topographic Ribbons, Chromatic Shimmer & Generative Scintillation
// Zero mouse dependency — 100% autonomous hypnotic fluid dynamics across entire site
// --------------------------------------------------------------------------
const asciiCanvas = ref(null);
let animationFrameId = null;

// Dark theme glyph sets
const GLYPHS_PEAK = ['✦', '✧', '◈', '◇', '▲', '1', '0', 'X', 'Z', 'K', 'E', 'D', 'R', '*', '#', '%'];
const GLYPHS_HIGH = ['+', '=', '~', '/', '\\', '§', '8', '3', '7', 'a', 'm', 'w', 'v'];
const GLYPHS_MID  = [':', ';', '|', '!', 'i', 'r', 'c', 's', 'o', '°'];
const GLYPHS_LOW  = ['·', '.', '~', '^', ':', ','];

// Light theme glyph sets (rich cyber symbols, numbers, and sharp runes)
const GLYPHS_LIGHT_PEAK = ['✦', '1', '0', 'X', 'Z', 'K', 'E', 'D', 'R', '8', '3', '#', '+', '×'];
const GLYPHS_LIGHT_HIGH = ['1', '0', 'x', '+', '=', '~', '8', '7', 'a', 'm', 'w', 'v', '§'];
const GLYPHS_LIGHT_MID  = [':', ';', '|', '!', 'i', 'r', 'c', 's', 'o', '°', '1', '0', '+', '~'];
const GLYPHS_LIGHT_LOW  = ['·', ':', '~', '^', '.', ','];

const getToastClasses = (type) => {
  switch (type) {
    case 'error':
      return 'bg-white dark:bg-red-950/90 text-rose-700 dark:text-red-200 border-rose-300 dark:border-red-500/40 shadow-rose-500/10 dark:shadow-red-900/30';
    case 'warning':
      return 'bg-white dark:bg-amber-950/90 text-amber-700 dark:text-amber-200 border-amber-300 dark:border-amber-500/40 shadow-amber-500/10 dark:shadow-amber-900/30';
    case 'info':
      return 'bg-white dark:bg-[#14141c]/95 text-orange-700 dark:text-[#fcb4d5] border-orange-300 dark:border-[#fcb4d5]/40 shadow-orange-500/10 dark:shadow-[#fcb4d5]/20';
    case 'success':
    default:
      return 'bg-white dark:bg-[#14141c]/95 text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40 shadow-emerald-500/10 dark:shadow-emerald-900/30';
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  } else {
    heartbeat();
    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(heartbeat, 60000);
    }
  }
};

let resizeCanvas = null;

onMounted(() => {
  initTheme();
  fetchMe();
  // 60-second online heartbeat (pauses on inactive tabs)
  heartbeatInterval = setInterval(heartbeat, 60000);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Initialize Global Wave Canvas
  const canvas = asciiCanvas.value;
  if (canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) {
      let width = 0;
      let height = 0;
      let cols = 0;
      let rows = 0;
      const charWidth = 14;
      const charHeight = 20;

      resizeCanvas = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = Math.ceil(width / charWidth);
        rows = Math.ceil(height / charHeight);
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      let time = 0;
      let lastFrameTime = 0;
      const BUCKET_COUNT = 8;
      const buckets = Array.from({ length: BUCKET_COUNT }, () => []);

      const render = (now) => {
        animationFrameId = requestAnimationFrame(render);
        if (document.hidden) return;
        // Frame throttling: ~38 FPS prevents GPU compositing stalls on complex views
        if (now && now - lastFrameTime < 26) return;
        lastFrameTime = now || 0;

        time += 0.012;
        const isDark = document.documentElement.classList.contains('dark');

        for (let i = 0; i < BUCKET_COUNT; i++) {
          buckets[i].length = 0;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.font = isDark ? '500 11px "JetBrains Mono", "SF Mono", "Fira Code", monospace' : '600 12px "JetBrains Mono", "SF Mono", "Fira Code", monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        const t = time * 0.45;

        for (let r = 0; r < rows; r++) {
          const ny = r / rows;
          const y = (r + 0.5) * charHeight;

          for (let c = 0; c < cols; c++) {
            const nx = c / cols;
            const x = (c + 0.5) * charWidth;

            const rx = nx * 3.4 - ny * 1.6;
            const ry = nx * 1.6 + ny * 3.4;

            const h1 = Math.sin(rx * 2.8 + t * 0.95 + Math.sin(ry * 2.0 - t * 0.65));
            const h2 = Math.cos(ry * 3.2 - t * 0.85 + Math.cos(rx * 2.2 + t * 0.45));
            const h3 = Math.sin((rx + ry) * 1.9 - t * 1.25);
            const distCenter = Math.hypot(nx - 0.5, ny - 0.5);
            const h4 = Math.sin(distCenter * 5.2 - t * 1.35);

            const field = h1 * 0.42 + h2 * 0.36 + h3 * 0.14 + h4 * 0.08;

            const ripple1 = Math.sin(field * 9.5 + t * 1.85);
            const ripple2 = Math.cos(field * 14.5 - t * 1.3 + nx * 2.4);

            const crest1 = Math.pow(Math.max(0, (ripple1 + 1) * 0.5), 2.6);
            const crest2 = Math.pow(Math.max(0, (ripple2 + 1) * 0.5), 3.2);
            let intensity = Math.min(1, Math.max(0, crest1 * 0.62 + crest2 * 0.48));

            if (intensity < 0.14) continue;

            const charSeed = Math.floor(
              Math.abs(Math.sin(c * 12.9898 + r * 78.233 + Math.floor(t * 3.2) * 0.1) * 43758.5453)
            );

            const shimmerPhase = field * 4.2 + t * 1.6 + nx * 3.0 + ny * 1.5;
            const shimmerVal = Math.sin(shimmerPhase);

            let char = '·';
            let bucketIdx = 0;

            if (isDark) {
              if (intensity > 0.82) {
                char = GLYPHS_PEAK[charSeed % GLYPHS_PEAK.length];
                bucketIdx = 7;
              } else if (intensity > 0.62) {
                char = GLYPHS_HIGH[charSeed % GLYPHS_HIGH.length];
                if (shimmerVal > 0.28) {
                  bucketIdx = 6;
                } else if (shimmerVal < -0.28) {
                  bucketIdx = 5;
                } else {
                  bucketIdx = 4;
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
              if (intensity > 0.82) {
                char = GLYPHS_LIGHT_PEAK[charSeed % GLYPHS_LIGHT_PEAK.length];
                bucketIdx = 7;
              } else if (intensity > 0.62) {
                char = GLYPHS_LIGHT_HIGH[charSeed % GLYPHS_LIGHT_HIGH.length];
                if (shimmerVal > 0.22) {
                  bucketIdx = 6;
                } else if (shimmerVal < -0.22) {
                  bucketIdx = 5;
                } else {
                  bucketIdx = 4;
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

            buckets[bucketIdx].push(x, y, char);
          }
        }

        if (isDark) {
          const STYLES_DARK = [
            'transparent',
            'rgba(148, 163, 184, 0.14)',
            'rgba(148, 163, 184, 0.30)',
            'rgba(203, 213, 225, 0.52)',
            'rgba(221, 214, 254, 0.78)',
            'rgba(56, 189, 248, 0.90)',
            'rgba(244, 114, 182, 0.92)',
            'rgba(255, 255, 255, 0.98)'
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
          const STYLES_LIGHT = [
            'transparent',
            'rgba(100, 116, 139, 0.50)', // Level 1 - crisp slate dots & commas
            'rgba(71, 85, 105, 0.75)',   // Level 2 - clear wave contours
            'rgba(30, 41, 59, 0.88)',    // Level 3 - deep dark slate symbols & numbers
            'rgba(217, 119, 6, 0.95)',   // Level 4 - rich golden amber
            'rgba(234, 88, 12, 0.98)',   // Level 5 - vibrant brand sunset orange
            'rgba(79, 70, 229, 0.96)',   // Level 6 - electric royal indigo / cobalt
            'rgba(15, 23, 42, 1.0)'      // Level 7 - peak sharp midnight obsidian glyphs
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
      };

      animationFrameId = requestAnimationFrame(render);
    }
  }
});

onUnmounted(() => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (resizeCanvas) {
    window.removeEventListener('resize', resizeCanvas);
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style>
.toast-enter-active {
  transition: transform 220ms var(--ease-out), opacity 200ms ease-out;
  will-change: transform, opacity;
}
.toast-leave-active {
  transition: transform 160ms var(--ease-out), opacity 140ms ease-in;
  will-change: transform, opacity;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
</style>
