export function getPracticalApplicationsForModule(practicalApplications, moduleId) {
  return practicalApplications?.[moduleId]?.applications ?? [];
}

export function summarizePracticalApplications(course, practicalApplications) {
  return (course?.modules ?? [])
    .map(module => {
      const applications = getPracticalApplicationsForModule(practicalApplications, module.id);
      if (!applications.length) return null;

      return {
        moduleId: module.id,
        moduleTitle: module.title,
        title: practicalApplications[module.id]?.title ?? `Practical applications — ${module.title}`,
        count: applications.length,
        applications,
      };
    })
    .filter(Boolean);
}

export function flattenPracticalApplications(course, practicalApplications) {
  return summarizePracticalApplications(course, practicalApplications)
    .flatMap(summary => summary.applications.map(application => ({
      moduleId: summary.moduleId,
      moduleTitle: summary.moduleTitle,
      application,
    })));
}