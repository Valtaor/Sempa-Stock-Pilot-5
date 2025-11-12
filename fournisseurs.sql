-- phpMyAdmin SQL Dump
-- version 4.9.11
-- https://www.phpmyadmin.net/
--
-- Hôte : db5001643902.hosting-data.io
-- Généré le : mer. 12 nov. 2025 à 05:55
-- Version du serveur : 5.7.42-log
-- Version de PHP : 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `dbs1363734`
--

-- --------------------------------------------------------

--
-- Structure de la table `fournisseurs`
--

CREATE TABLE `fournisseurs` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_contact` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telephone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `adresse` text COLLATE utf8mb4_unicode_ci COMMENT 'Adresse du fournisseur',
  `code_postal` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Code postal',
  `ville` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ville',
  `pays` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'France' COMMENT 'Pays',
  `site_web` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Site web',
  `siret` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Numéro SIRET',
  `conditions_paiement` text COLLATE utf8mb4_unicode_ci COMMENT 'Conditions de paiement',
  `delai_livraison` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Délai de livraison habituel',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Notes et commentaires'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `fournisseurs`
--

INSERT INTO `fournisseurs` (`id`, `nom`, `nom_contact`, `telephone`, `email`, `date_creation`, `adresse`, `code_postal`, `ville`, `pays`, `site_web`, `siret`, `conditions_paiement`, `delai_livraison`, `notes`) VALUES
(1, 'CITROCASA', '', '', '', '2025-10-20 12:35:53', NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL),
(2, 'TEMAPLASTE', '', '', '', '2025-10-21 08:25:21', NULL, NULL, NULL, 'France', NULL, NULL, NULL, NULL, NULL);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `fournisseurs`
--
ALTER TABLE `fournisseurs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nom_unique` (`nom`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `fournisseurs`
--
ALTER TABLE `fournisseurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
