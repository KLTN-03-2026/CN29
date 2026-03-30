const indexRouter = require('./index');
const usersRouter = require('./users');
const authRouter = require('./auth');
const changePasswordRouter = require('./change-password');
const jobsRouter = require('./jobs');
const applicationsRouter = require('./applications');
const cvsRouter = require('./cvs');
const mockJobsRouter = require('./mock-jobs');
const universitiesRouter = require('./universities');
const aiRouter = require('./ai');
const provincesRouter = require('./provinces');
const companiesRouter = require('./companies');
const adminRouter = require('./admin');
const employerRouter = require('./employer');
const messagesRouter = require('./messages');
const careerGuideRouter = require('./career-guide');

function registerRoutes(app, mountPath) {
  app.use(mountPath('/'), indexRouter);
  app.use(mountPath('/users'), usersRouter);
  app.use(mountPath('/auth'), authRouter);
  app.use(mountPath('/auth/change-password'), changePasswordRouter);
  app.use(mountPath('/jobs'), jobsRouter);
  app.use(mountPath('/applications'), applicationsRouter);
  app.use(mountPath('/api/cvs'), cvsRouter);
  app.use(mountPath('/api/mock-jobs'), mockJobsRouter);
  app.use(mountPath('/api/universities'), universitiesRouter);
  app.use(mountPath('/api/ai'), aiRouter);
  app.use(mountPath('/api/provinces'), provincesRouter);
  app.use(mountPath('/api/companies'), companiesRouter);
  app.use(mountPath('/api/admin'), adminRouter);
  app.use(mountPath('/api/employer'), employerRouter);
  app.use(mountPath('/api/messages'), messagesRouter);
  app.use(mountPath('/api/career-guide'), careerGuideRouter);
}

module.exports = { registerRoutes };