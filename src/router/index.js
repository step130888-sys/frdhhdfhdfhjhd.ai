import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ContentPlanView from '../views/ContentPlanView.vue';
import TaskDetailView from '../views/TaskDetailView.vue';
import ProfileView from '../views/ProfileView.vue';
import ManagementView from '../views/ManagementView.vue';
import MaterialsView from '../views/MaterialsView.vue';
import AdminUsersView from '../views/AdminUsersView.vue';

const routes = [
  {
    path: '/',
    redirect: '/content-plan'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { guestOnly: true }
  },
  {
    path: '/content-plan',
    name: 'content-plan',
    component: ContentPlanView,
    meta: { requiresAuth: true }
  },
  {
    path: '/task/:id',
    alias: ['/tasks/:id'],
    name: 'task-detail',
    component: TaskDetailView,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:id',
    name: 'profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/management',
    name: 'management',
    component: ManagementView,
    meta: { requiresAuth: true, minLevel: 3 }
  },
  {
    path: '/materials',
    name: 'materials',
    component: MaterialsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: AdminUsersView,
    meta: { requiresAuth: true, minLevel: 4 }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/content-plan'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (authStore.loading.value) {
    await authStore.fetchMe();
  }

  const loggedIn = authStore.isLoggedIn.value;
  const user = authStore.user.value;

  if (to.meta.guestOnly && loggedIn) {
    return next('/content-plan');
  }

  if (to.meta.requiresAuth) {
    if (!loggedIn) {
      return next('/login');
    }
    if (!user.is_approved) {
      authStore.showNotification('Ваш профиль ожидает одобрения администратором (4 уровень).', 'warning');
      return next('/login');
    }
    if (to.meta.minLevel && user.access_level < to.meta.minLevel) {
      authStore.showNotification('Недостаточно прав для доступа к данному разделу.', 'error');
      return next('/content-plan');
    }
  }

  next();
});

export default router;
