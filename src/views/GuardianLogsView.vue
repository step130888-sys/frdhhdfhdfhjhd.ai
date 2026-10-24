<template>
  <div class="max-w-7xl mx-auto px-2 sm:px-4 pb-24 sm:pb-10 space-y-4 sm:space-y-6">
    <!-- Top Header -->
    <div class="glass-card rounded-2xl p-4 sm:p-6 border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-[#0d131f] to-emerald-950/20 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-600/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-lg shadow-amber-950/50">
          🛡️
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
              Центр Аудита и Защиты Хранителя
            </h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40">
              Level 5 • Security Radar
            </span>
          </div>
          <p class="text-xs sm:text-sm text-gray-400 mt-0.5">
            Полный журнал изменений на платформе, мониторинг сетевых подключений и защита от DDoS / Brute-force атак
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          @click="autoRefresh = !autoRefresh"
          class="px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2"
          :class="autoRefresh
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
            : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'"
        >
          <span class="w-2 h-2 rounded-full" :class="autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'"></span>
          <span>{{ autoRefresh ? 'Live-радар: ВКЛ (3с)' : 'Live-радар: ПАУЗА' }}</span>
        </button>

        <button
          @click="fetchLogs"
          :disabled="loading"
          class="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
        >
          <span :class="{ 'animate-spin': loading }">↻</span>
          <span>Обновить</span>
        </button>
      </div>
    </div>

    <!-- Real-Time Traffic & Anti-DDoS Telemetry Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- Card 1: Current Load (RPM / RPS) -->
      <div class="glass-card rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Нагрузка трафика</span>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-bold"
            :class="traffic.requests_per_minute > 250
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : traffic.requests_per_minute > 100
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'"
          >
            {{ traffic.requests_per_minute > 250 ? 'ВЫСОКАЯ' : traffic.requests_per_minute > 100 ? 'СРЕДНЯЯ' : 'НОРМА' }}
          </span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {{ traffic.requests_per_minute || 0 }} <span class="text-xs font-semibold text-gray-400">запр/мин</span>
        </div>
        <div class="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
          <span>Сейчас: <strong class="text-emerald-300">{{ traffic.requests_per_second || 0 }}</strong> RPS</span>
          <span>Пик: <strong class="text-amber-300">{{ traffic.peak_rpm || 0 }}</strong> RPM</span>
        </div>
      </div>

      <!-- Card 2: Total Requests -->
      <div class="glass-card rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Всего HTTP-запросов</span>
          <span class="text-cyan-400 font-bold">🌐 Сессия</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {{ traffic.total_requests || 0 }}
        </div>
        <div class="text-[11px] text-gray-400 mt-1">
          Аптайм монитора: <strong class="text-gray-200">{{ formatUptime(traffic.uptime_seconds) }}</strong>
        </div>
      </div>

      <!-- Card 3: Blocked Attacks / DDoS Drops -->
      <div class="glass-card rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Отражено угроз / 429</span>
          <span class="text-rose-400 font-bold">🛡️ Защита</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold" :class="traffic.blocked_requests > 0 ? 'text-rose-400' : 'text-emerald-400'">
          {{ traffic.blocked_requests || 0 }}
        </div>
        <div class="text-[11px] text-gray-400 mt-1">
          В бан-листе IP: <strong class="text-rose-300">{{ (traffic.banned_ips || []).length }}</strong>
        </div>
      </div>

      <!-- Card 4: Active Unique IPs -->
      <div class="glass-card rounded-2xl p-4 border border-white/10">
        <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Уникальных IP</span>
          <span class="text-amber-300 font-bold">📡 Хосты</span>
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {{ traffic.active_ips_count || 0 }}
        </div>
        <div class="text-[11px] text-gray-400 mt-1">
          Записей аудита: <strong class="text-amber-300">{{ auditLogs.length }}</strong>
        </div>
      </div>
    </div>

    <!-- Main Mode Switcher Tabs -->
    <div class="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
      <button
        @click="activeTab = 'audit'"
        class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap border"
        :class="activeTab === 'audit'
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-950/30'
          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'"
      >
        <span>📜 Кто что менял (Аудит действий)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-amber-200">{{ auditLogs.length }}</span>
      </button>

      <button
        @click="activeTab = 'connections'"
        class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap border"
        :class="activeTab === 'connections'
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'"
      >
        <span>📡 Подключения и Анти-DDoS Радар</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-emerald-200">{{ (traffic.top_ips || []).length }} IP</span>
      </button>

      <button
        @click="activeTab = 'stream'"
        class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap border"
        :class="activeTab === 'stream'
          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'"
      >
        <span>⚡ Live-поток HTTP запросов</span>
      </button>
    </div>

    <!-- TAB 1: AUDIT LOGS ("Кто что менял") -->
    <div v-if="activeTab === 'audit'" class="space-y-4">
      <!-- Filter & Search Bar -->
      <div class="glass-card rounded-2xl p-3.5 sm:p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            v-for="cat in auditCategories"
            :key="cat.value"
            @click="selectedCategory = cat.value; fetchLogs()"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition border"
            :class="selectedCategory === cat.value
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'"
          >
            {{ cat.label }}
          </button>
        </div>

        <div class="relative flex-1 min-w-[220px] max-w-md">
          <input
            v-model="searchQuery"
            @input="debouncedSearch"
            type="text"
            placeholder="Поиск по имени, действию, профилю, задаче или IP..."
            class="w-full bg-black/40 border border-white/15 focus:border-amber-500/50 rounded-xl pl-3.5 pr-9 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''; fetchLogs()"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Audit Logs Table / List -->
      <div class="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div v-if="auditLogs.length === 0" class="p-10 text-center text-gray-400 text-sm">
          Записей аудита по выбранному фильтру пока нет.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th class="py-3 px-4">Время</th>
                <th class="py-3 px-4">Кто выполнил</th>
                <th class="py-3 px-4">Действие</th>
                <th class="py-3 px-4">Объект</th>
                <th class="py-3 px-4">Подробности изменений</th>
                <th class="py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-xs">
              <tr
                v-for="item in auditLogs"
                :key="item.id"
                class="hover:bg-white/[0.03] transition"
              >
                <td class="py-3 px-4 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                  {{ formatDateTime(item.created_at) }}
                </td>
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] text-white bg-gradient-to-br from-emerald-600 to-teal-700 flex-shrink-0"
                    >
                      {{ item.user_name ? item.user_name.charAt(0).toUpperCase() : '⚙️' }}
                    </div>
                    <div>
                      <router-link
                        v-if="item.user_id"
                        :to="`/profile/${item.user_id}`"
                        class="font-bold text-white hover:text-amber-300 transition"
                      >
                        {{ item.user_name }}
                      </router-link>
                      <span v-else class="font-bold text-gray-300">{{ item.user_name || 'Система' }}</span>
                      <div class="text-[10px] text-gray-400">
                        <span v-if="item.username">@{{ item.username }}</span>
                        <span v-if="item.user_level" class="ml-1 text-amber-300/90">• {{ item.user_level }} ур.</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 whitespace-nowrap">
                  <span
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-block"
                    :class="auditCategoryBadge(item.category)"
                  >
                    {{ item.action }}
                  </span>
                </td>
                <td class="py-3 px-4 font-semibold text-gray-200 max-w-[200px] truncate" :title="item.target">
                  {{ item.target || '—' }}
                </td>
                <td class="py-3 px-4 text-gray-300 max-w-md break-words leading-relaxed">
                  {{ item.details || '—' }}
                </td>
                <td class="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-gray-400">
                  {{ item.ip || '127.0.0.1' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: CONNECTION & ANTI-DDOS RADAR -->
    <div v-else-if="activeTab === 'connections'" class="space-y-5">
      <!-- Manual IP Ban Control Bar -->
      <div class="glass-card rounded-2xl p-4 border border-rose-500/25 bg-gradient-to-r from-rose-950/20 to-transparent">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>🔨 Ручная блокировка подозрительного IP (Firewall)</span>
            </h3>
            <p class="text-xs text-gray-400 mt-0.5">
              Заблокированный IP мгновенно получает отказ (HTTP 429) ко всем маршрутам сервера. Авто-защита сама блокирует IP при &gt;360 запр/мин.
            </p>
          </div>

          <form @submit.prevent="submitManualBan" class="flex flex-wrap items-center gap-2">
            <input
              v-model="banForm.ip"
              type="text"
              placeholder="IP-адрес (напр. 45.12.34.56)"
              class="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none w-44 font-mono"
            />
            <select
              v-model.number="banForm.minutes"
              class="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
            >
              <option :value="15">На 15 минут</option>
              <option :value="60">На 1 час</option>
              <option :value="360">На 6 часов</option>
              <option :value="1440">На 24 часа</option>
              <option :value="10080">На 7 суток</option>
            </select>
            <input
              v-model="banForm.reason"
              type="text"
              placeholder="Причина (напр. Подозрение на DDoS)"
              class="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-rose-500 focus:outline-none w-52"
            />
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-950/50"
            >
              Заблокировать IP
            </button>
          </form>
        </div>

        <!-- Active Banned IPs Pills -->
        <div v-if="(traffic.banned_ips || []).length > 0" class="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-rose-300">Активные блокировки:</span>
          <div
            v-for="b in traffic.banned_ips"
            :key="b.ip"
            class="flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs"
          >
            <span class="font-mono font-bold text-rose-200">{{ b.ip }}</span>
            <span class="text-[11px] text-gray-300">({{ b.reason }} — ещё {{ b.remaining_minutes }} мин)</span>
            <button
              @click="unbanIp(b.ip)"
              class="text-emerald-300 hover:text-emerald-200 font-bold underline ml-1"
            >
              Разблокировать
            </button>
          </div>
        </div>
      </div>

      <!-- Live IP Radar Table -->
      <div class="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="text-sm font-bold text-white">📡 Радар активных IP-подключений (Анти-DDoS Монитор)</h3>
            <p class="text-xs text-gray-400">Отслеживание частоты запросов (RPM) с каждого IP-адреса в реальном времени</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th class="py-3 px-4">IP-адрес</th>
                <th class="py-3 px-4">Частота (RPM)</th>
                <th class="py-3 px-4">Всего запросов</th>
                <th class="py-3 px-4">Ошибки / 4xx</th>
                <th class="py-3 px-4">Аккаунт</th>
                <th class="py-3 px-4">Последний маршрут</th>
                <th class="py-3 px-4">User-Agent</th>
                <th class="py-3 px-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-xs">
              <tr
                v-for="host in (traffic.top_ips || [])"
                :key="host.ip"
                class="hover:bg-white/[0.03] transition"
                :class="host.is_banned ? 'bg-rose-950/20' : ''"
              >
                <td class="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span>{{ host.ip }}</span>
                    <span
                      v-if="host.is_banned"
                      class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-sans font-bold"
                    >
                      BANNED
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-bold font-mono"
                      :class="host.rpm > 180 ? 'text-rose-400' : host.rpm > 80 ? 'text-amber-300' : 'text-emerald-400'"
                    >
                      {{ host.rpm }} / мин
                    </span>
                    <div class="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="host.rpm > 180 ? 'bg-rose-500' : host.rpm > 80 ? 'bg-amber-400' : 'bg-emerald-400'"
                        :style="{ width: Math.min(100, Math.round((host.rpm / 200) * 100)) + '%' }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 font-mono text-gray-200">{{ host.total_requests }}</td>
                <td class="py-3 px-4 font-mono" :class="host.blocked_count > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'">
                  {{ host.blocked_count || 0 }}
                </td>
                <td class="py-3 px-4 text-gray-200 whitespace-nowrap">
                  <span v-if="host.username || host.last_user" class="text-emerald-300 font-semibold">@{{ host.username || host.last_user }}</span>
                  <span v-else class="text-gray-500">Гость</span>
                </td>
                <td class="py-3 px-4 font-mono text-[11px] text-gray-300 max-w-[180px] truncate" :title="host.last_path">
                  {{ host.last_path }}
                </td>
                <td class="py-3 px-4 text-[11px] text-gray-400 max-w-[200px] truncate" :title="host.user_agent">
                  {{ host.user_agent }}
                </td>
                <td class="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    v-if="host.is_banned"
                    @click="unbanIp(host.ip)"
                    class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition"
                  >
                    Разблокировать
                  </button>
                  <button
                    v-else-if="host.ip !== '127.0.0.1' && host.ip !== '::1'"
                    @click="quickBanIp(host.ip)"
                    class="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition"
                  >
                    Бан IP
                  </button>
                  <span v-else class="text-[10px] text-gray-500">Localhost</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Connection & Security Events Log from SQLite -->
      <div class="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div class="p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="text-sm font-bold text-white">🚨 Журнал сетевых подключений и инцидентов безопасности</h3>
            <p class="text-xs text-gray-400">Авторизации, блокировки Brute-force, SQLi-попытки, всплески DDoS и API-мутации</p>
          </div>
          <button
            @click="clearRoutineConnectionLogs"
            class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition"
          >
            🧹 Очистить рядовые записи
          </button>
        </div>

        <div v-if="connectionLogs.length === 0" class="p-8 text-center text-gray-400 text-xs">
          Записей подключений пока нет.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th class="py-3 px-4">Время</th>
                <th class="py-3 px-4">Тип события</th>
                <th class="py-3 px-4">IP-адрес</th>
                <th class="py-3 px-4">Пользователь</th>
                <th class="py-3 px-4">Запрос / Код</th>
                <th class="py-3 px-4">Подробности</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 text-xs">
              <tr
                v-for="ev in connectionLogs"
                :key="ev.id"
                class="hover:bg-white/[0.03] transition"
              >
                <td class="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-gray-400">
                  {{ formatDateTime(ev.created_at) }}
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap">
                  <span
                    class="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border"
                    :class="eventBadgeClass(ev.event_type)"
                  >
                    {{ eventLabel(ev.event_type) }}
                  </span>
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap font-mono text-white">
                  {{ ev.ip }}
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap text-gray-300">
                  <span v-if="ev.username" class="text-emerald-300 font-semibold">@{{ ev.username }}</span>
                  <span v-else class="text-gray-500">—</span>
                </td>
                <td class="py-2.5 px-4 whitespace-nowrap font-mono text-[11px]">
                  <span class="text-gray-300">{{ ev.method }} {{ ev.path }}</span>
                  <span
                    class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                    :class="ev.status_code >= 400 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'"
                  >
                    {{ ev.status_code }}
                  </span>
                </td>
                <td class="py-2.5 px-4 text-gray-300 max-w-md break-words">
                  {{ ev.details }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: LIVE HTTP REQUEST STREAM -->
    <div v-else-if="activeTab === 'stream'" class="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div class="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-white">⚡ Live-лента последних HTTP-запросов к серверу</h3>
          <p class="text-xs text-gray-400">Кольцевой буфер в оперативной памяти (последние 120 запросов с временем отклика в мс)</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <th class="py-2.5 px-4">Время</th>
              <th class="py-2.5 px-4">IP</th>
              <th class="py-2.5 px-4">Метод / Путь</th>
              <th class="py-2.5 px-4">Статус</th>
              <th class="py-2.5 px-4">Отклик</th>
              <th class="py-2.5 px-4">RPM с IP</th>
              <th class="py-2.5 px-4">Пользователь</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-xs font-mono">
            <tr
              v-for="reqItem in (traffic.recent_requests || [])"
              :key="reqItem.id"
              class="hover:bg-white/[0.03]"
            >
              <td class="py-2 px-4 text-gray-400 text-[11px] whitespace-nowrap">
                {{ formatDateTime(reqItem.timestamp) }}
              </td>
              <td class="py-2 px-4 text-white whitespace-nowrap">{{ reqItem.ip }}</td>
              <td class="py-2 px-4 text-cyan-300 max-w-xs truncate" :title="reqItem.path">
                <span class="font-bold text-white mr-1.5">{{ reqItem.method }}</span>{{ reqItem.path }}
              </td>
              <td class="py-2 px-4">
                <span
                  class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  :class="reqItem.status >= 400 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'"
                >
                  {{ reqItem.status }}
                </span>
              </td>
              <td class="py-2 px-4 text-gray-300">{{ reqItem.duration_ms }} ms</td>
              <td class="py-2 px-4" :class="reqItem.rpm > 150 ? 'text-rose-400 font-bold' : 'text-gray-400'">
                {{ reqItem.rpm }} rpm
              </td>
              <td class="py-2 px-4 text-emerald-300 font-sans">
                {{ reqItem.username ? `@${reqItem.username}` : 'Гость' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const { showNotification } = useAuthStore();

const activeTab = ref('audit');
const loading = ref(false);
const autoRefresh = ref(true);
const selectedCategory = ref('all');
const searchQuery = ref('');

const auditLogs = ref([]);
const connectionLogs = ref([]);
const traffic = ref({
  uptime_seconds: 0,
  total_requests: 0,
  blocked_requests: 0,
  requests_per_minute: 0,
  requests_per_second: 0,
  peak_rpm: 0,
  active_ips_count: 0,
  banned_ips: [],
  top_ips: [],
  recent_requests: []
});

const banForm = ref({
  ip: '',
  minutes: 60,
  reason: 'Подозрительная активность / DDoS'
});

const auditCategories = [
  { value: 'all', label: 'Все события' },
  { value: 'users', label: '👤 Профили и права' },
  { value: 'tasks', label: '📋 Задачи' },
  { value: 'auth', label: '🔑 Входы и сессии' },
  { value: 'materials', label: '📁 Материалы' },
  { value: 'chat', label: '💬 Чат' },
  { value: 'security', label: '🛡️ Безопасность' }
];

let refreshTimer = null;
let searchDebounce = null;

const auditCategoryBadge = (cat) => {
  switch (cat) {
    case 'users': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'tasks': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'auth': return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    case 'security': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    case 'materials': return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    default: return 'bg-white/10 text-gray-300 border-white/15';
  }
};

const eventLabel = (type) => {
  const map = {
    ddos_throttled: '🔥 DDoS Блок (429)',
    ddos_warning: '⚠️ Всплеск запросов',
    sqli_attempt: '☣️ SQL-инъекция',
    login_lockout: '🔒 Блок Brute-Force',
    login_failed: '❌ Неверный пароль',
    login_success: '✅ Вход в систему',
    ip_banned: '🔨 Бан IP',
    ip_unbanned: '🔓 Разбан IP',
    api_mutation: '⚡ API Запрос'
  };
  return map[type] || type;
};

const eventBadgeClass = (type) => {
  if (['ddos_throttled', 'sqli_attempt', 'login_lockout', 'ip_banned'].includes(type)) {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }
  if (['ddos_warning', 'login_failed'].includes(type)) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }
  if (['login_success', 'ip_unbanned'].includes(type)) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  return 'bg-white/10 text-gray-300 border-white/15';
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return iso;
  }
};

const formatUptime = (sec) => {
  if (!sec) return '0 мин';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин ${sec % 60} сек`;
};

const fetchLogs = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (selectedCategory.value && selectedCategory.value !== 'all') {
      params.set('category', selectedCategory.value);
    }
    if (searchQuery.value.trim()) {
      params.set('search', searchQuery.value.trim());
    }
    const res = await fetch(`/api/guardian/logs?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.success) {
      auditLogs.value = data.audit_logs || [];
      connectionLogs.value = data.connection_logs || [];
      if (data.traffic) {
        traffic.value = data.traffic;
      }
    }
  } catch (e) {
    console.error('Failed to fetch guardian logs:', e);
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    fetchLogs();
  }, 300);
};

const submitManualBan = async () => {
  if (!banForm.value.ip.trim()) return;
  try {
    const res = await fetch('/api/guardian/security/ban-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banForm.value)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка блокировки IP');
    showNotification(data.message, 'success');
    banForm.value.ip = '';
    fetchLogs();
  } catch (e) {
    showNotification(e.message, 'error');
  }
};

const quickBanIp = async (ip) => {
  try {
    const res = await fetch('/api/guardian/security/ban-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, minutes: 60, reason: 'Блокировка из радара подключений' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка блокировки IP');
    showNotification(data.message, 'success');
    fetchLogs();
  } catch (e) {
    showNotification(e.message, 'error');
  }
};

const unbanIp = async (ip) => {
  try {
    const res = await fetch('/api/guardian/security/unban-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка разблокировки IP');
    showNotification(data.message, 'success');
    fetchLogs();
  } catch (e) {
    showNotification(e.message, 'error');
  }
};

const clearRoutineConnectionLogs = async () => {
  try {
    const res = await fetch('/api/guardian/logs/clear-connections', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message, 'info');
      fetchLogs();
    }
  } catch (e) {}
};

onMounted(() => {
  fetchLogs();
  refreshTimer = setInterval(() => {
    if (autoRefresh.value) {
      fetchLogs();
    }
  }, 3000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (searchDebounce) clearTimeout(searchDebounce);
});
</script>
