const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder } = require('discord.js');

/**
 * Správa projektov s AI plánovaním a deadline trackingom
 */
class ProjectManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../data/projects');
    this.projectsFile = path.join(this.dataDir, 'projects.json');
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async loadProjects() {
    try {
      const data = await fs.readFile(this.projectsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveProjects(projects) {
    await fs.writeFile(this.projectsFile, JSON.stringify(projects, null, 2));
  }

  async createProject(name, deadline, description = '') {
    const projects = await this.loadProjects();
    
    const newProject = {
      id: Date.now().toString(),
      name,
      deadline: new Date(deadline).toISOString(),
      description,
      status: 'planning', // planning, in_progress, completed
      createdAt: new Date().toISOString(),
      tasks: [],
      aiPlan: null
    };

    projects.push(newProject);
    await this.saveProjects(projects);

    return newProject;
  }

  async listProjects() {
    return await this.loadProjects();
  }

  async getProject(projectId) {
    const projects = await this.loadProjects();
    return projects.find(p => p.id === projectId);
  }

  async updateProjectStatus(projectId, status) {
    const projects = await this.loadProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
      project.status = status;
      await this.saveProjects(projects);
      return project;
    }
    
    return null;
  }

  async generateAIPlan(projectName, deadline, description) {
    // Jednoduchá AI plánovacia logika (môže byť nesôr integrovaná s Gemini/GPT-4)
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    const plan = {
      phases: [],
      estimatedHours: daysUntilDeadline * 6, // 6 hodín denne
      milestones: []
    };

    // Fáza 1: Research (20% času)
    const researchDays = Math.ceil(daysUntilDeadline * 0.2);
    plan.phases.push({
      name: 'Research & Planning',
      duration: `${researchDays} dní`,
      tasks: [
        'Analýza podobných projektov',
        'Definovanie require',
        'Vytvorenie technického designu'
      ]
    });

    // Fáza 2: Development (50% času)
    const devDays = Math.ceil(daysUntilDeadline * 0.5);
    plan.phases.push({
      name: 'Development',
      duration: `${devDays} dní`,
      tasks: [
        'Implementácia core funkcionality',
        'Integrácia s existujúcimi systémami',
        'Unit testing'
      ]
    });

    // Fáza 3: Testing & Deploy (30% času)
    const testDays = Math.ceil(daysUntilDeadline * 0.3);
    plan.phases.push({
      name: 'Testing & Deployment',
      duration: `${testDays} dní`,
      tasks: [
        'QA testing',
        'Bug fixing',
        'Deployment do produkcie',
        'Monitorovanie'
      ]
    });

    return plan;
  }

  buildProjectEmbed(project) {
    const embed = new EmbedBuilder()
      .setTitle(`📂 ${project.name}`)
      .setColor(project.status === 'completed' ? 0x00FF00 : 0xFFA500)
      .addFields(
        { name: 'Status', value: project.status.toUpperCase(), inline: true },
        { name: 'Deadline', value: new Date(project.deadline).toLocaleDateString('sk-SK'), inline: true },
        { name: 'ID', value: project.id, inline: true }
      )
      .setTimestamp(new Date(project.createdAt));

    if (project.description) {
      embed.setDescription(project.description);
    }

    if (project.aiPlan) {
      const planText = project.aiPlan.phases
        .map((phase, i) => `**${i + 1}. ${phase.name}** (${phase.duration})\n${phase.tasks.map(t => `  • ${t}`).join('\n')}`)
        .join('\n\n');
      
      embed.addFields({ name: '🤖 AI Plán', value: planText });
    }

    return embed;
  }
}

module.exports = { ProjectManager };
