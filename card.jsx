import React, { useState } from 'react';
import { ExternalLink, Github, ArrowRight } from 'lucide-react';
import { projects } from '../data/projects';
import ProjectModal from './ProjectModal';

export default function Hero() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center text-white mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <ProjectCard key={index} project={project} onViewDetails={openModal} />
        ))}
      </div>
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onViewDetails }) {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-purple-400 transition-all duration-300 hover:scale-105 group cursor-pointer">

      <div
        className="h-26 bg-gradient-to-br from-purple-900 to-blue-900 relative overflow-hidden"
        onClick={() => onViewDetails(project)}
      >
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <div className="text-white text-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            View Details
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300">
          {project.title}
        </h3>
        <p className="text-gray-300 mb-4 line-clamp-2">
          {project.description}
        </p>


        <div className="flex justify-between items-center">
          <button
            onClick={() => onViewDetails(project)}
            className="flex items-center text-purple-300 hover:text-white transition-colors group"
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex justify-end">
            <a
              href={project.liveUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Live Demo"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
