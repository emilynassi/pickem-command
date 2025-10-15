import tracer from 'dd-trace';

tracer.init({
  profiling: true,
  logInjection: true,
  runtimeMetrics: true,
  dbmPropagationMode: 'full',
  env: process.env.NODE_ENV || 'development',
  sampleRate: 1,
  service: process.env.DD_SERVICE || 'pickem-command',
  version: process.env.DD_VERSION || '1.0.0',
});

export { tracer };
