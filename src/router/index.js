import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Route-level code-splitting: Views are lazy-loaded on demand
const LoginView = () => import('../views/LoginView.vue');
const RegisterView = () => import('../views/RegisterView.vue');
const ContentPlanView = () => import('../views/ContentPlanView.vue');
const TaskDetailView = () => import('../views/TaskDetailView.vue');
const ProfileView = () => import('../views/ProfileView.vue');
const ManagementView = () => import('../views/ManagementView.vue');
const MaterialsView = () => import('../views/MaterialsView.vue');
const AdminUsersView = () => import('../views/AdminUsersView.vue');

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
    path: '/secret-debt-usa',
    name: 'secret-debt-usa',
    component: () => import('../views/USADebtView.vue'),
    meta: { requiresAuth: true, minLevel: 5 }
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
