import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Boards
export const getBoards = () => api.get('/boards').then(r => r.data)
export const getBoard  = (slug: string) => api.get(`/boards/${slug}`).then(r => r.data)
export const getBoardStats = (slug: string) => api.get(`/boards/${slug}/stats`).then(r => r.data)
export const createBoard = (d: any) => api.post('/boards', d).then(r => r.data)
export const deleteBoard = (id: string) => api.delete(`/boards/${id}`).then(r => r.data)

// Threads
export const getThreads = (params?: any) => api.get('/threads', { params }).then(r => r.data)
export const getThread  = (id: string) => api.get(`/threads/${id}`).then(r => r.data)
export const createThread = (d: any) => api.post('/threads', d).then(r => r.data)
export const deleteThread = (id: string) => api.delete(`/threads/${id}`).then(r => r.data)

// Posts
export const getPosts  = (params?: any) => api.get('/posts', { params }).then(r => r.data)
export const getPost   = (id: string) => api.get(`/posts/${id}`).then(r => r.data)
export const createPost = (d: any) => api.post('/posts', d).then(r => r.data)
export const softDelete = (id: string) => api.delete(`/posts/${id}/soft`).then(r => r.data)
export const deletePost = (id: string) => api.delete(`/posts/${id}`).then(r => r.data)
export const scorePost  = (id: string, delta: number) => api.patch(`/posts/${id}/score`, null, { params: { delta } }).then(r => r.data)

// Users
export const getUsers   = (params?: any) => api.get('/users', { params }).then(r => r.data)
export const getMods    = () => api.get('/users/moderators').then(r => r.data)
export const createUser = (d: any) => api.post('/users', d).then(r => r.data)
export const createMod  = (d: any) => api.post('/users/moderators', d).then(r => r.data)
export const deleteUser = (id: string) => api.delete(`/users/${id}`).then(r => r.data)

// Generic Nodes
export const listNodes   = (label: string, params?: any) => api.get(`/nodes/${label}`, { params }).then(r => r.data)
export const getNode     = (label: string, id: string) => api.get(`/nodes/${label}/${id}`).then(r => r.data)
export const setNodeProp = (label: string, id: string, d: any) => api.patch(`/nodes/${label}/${id}/property`, d).then(r => r.data)
export const removeNodeProp = (label: string, id: string, prop: string) => api.delete(`/nodes/${label}/${id}/property/${prop}`).then(r => r.data)
export const bulkSetNodeProp = (label: string, d: any) => api.patch(`/nodes/${label}/bulk/property`, d).then(r => r.data)
export const bulkRemoveNodeProp = (label: string, prop: string, params?: any) => api.delete(`/nodes/${label}/bulk/property/${prop}`, { params }).then(r => r.data)
export const deleteNode  = (label: string, id: string) => api.delete(`/nodes/${label}/${id}`).then(r => r.data)
export const bulkDeleteNodes = (label: string, params?: any) => api.delete(`/nodes/${label}/bulk/delete`, { params }).then(r => r.data)

// Relationships
export const listRels   = (rel_type: string, limit = 30) => api.get('/relationships', { params: { rel_type, limit } }).then(r => r.data)
export const createRel  = (d: any) => api.post('/relationships', d).then(r => r.data)
export const setRelProp = (type: string, id: number, d: any) => api.patch(`/relationships/${type}/${id}/property`, d).then(r => r.data)
export const removeRelProp = (type: string, id: number, prop: string) => api.delete(`/relationships/${type}/${id}/property/${prop}`).then(r => r.data)
export const bulkSetRelProp = (type: string, d: any) => api.patch(`/relationships/${type}/bulk/property`, d).then(r => r.data)
export const deleteRel  = (type: string, id: number) => api.delete(`/relationships/${type}/${id}`).then(r => r.data)
export const bulkDeleteRels = (type: string, params?: any) => api.delete(`/relationships/${type}/bulk/delete`, { params }).then(r => r.data)

// Analytics
export const getStats          = () => api.get('/analytics/stats').then(r => r.data)
export const getSuspiciousIPs  = () => api.get('/analytics/suspicious-ips').then(r => r.data)
export const getActiveThreads  = () => api.get('/analytics/active-threads').then(r => r.data)
export const getQuoteChains    = () => api.get('/analytics/quote-chains').then(r => r.data)
export const getTopUsers       = () => api.get('/analytics/top-users').then(r => r.data)
export const getUnmodBoards    = () => api.get('/analytics/unmoderated-boards').then(r => r.data)
export const getReportsDist    = () => api.get('/analytics/reports-distribution').then(r => r.data)
export const getPageRank         = () => api.get('/analytics/pagerank').then(r => r.data)
export const getBoardStats2      = () => api.get('/analytics/board-stats').then(r => r.data)
export const getCountryPosts     = () => api.get('/analytics/country-posts').then(r => r.data)
export const getCountryInfluence = () => api.get('/analytics/country-influence').then(r => r.data)
