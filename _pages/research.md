---
permalink: /research/
title: "Research"
layout: dark
author_profile: false
---

## Lines of Research

### Net Zero Industrial Policy

My applied policy research programme at the [Net Zero Industrial Policy Lab](https://www.netzeropolicylab.com/) at Johns Hopkins University. The central question: what does the industrial base of the new energy economy look like, and what policy instruments can accelerate its development while managing distributional consequences across regions and income groups?

Using multi-region input-output analysis, supply chain mapping, and sectoral network methods applied to global trade and production data, I study:

- The structure and geography of green value chains — batteries, solar, wind, and electrolysis — and their upstream industrial dependencies
- How industrial policy instruments (subsidies, domestic content requirements, green public procurement) reshape comparative advantage and value capture across the North-South divide
- The macroeconomic implications of rapid sectoral reallocation: which sectors are keystone nodes in the production network, and what happens when they are disrupted by the low-carbon transition?
- The intersection of climate policy and global inequality: how decarbonisation strategies in the Global North transmit through trade and value chains to shape development trajectories in the Global South

**Current output**: The Net Zero Value Chain Explorer — a computational tool mapping the industrial base of the clean energy transition across 54 industries and multiple countries, built for policy audiences.

---

### Classical Economic Thermodynamics

The central programme of my theoretical work. The classical political economy tradition — Smith, Ricardo, Marx, Sraffa — provides the correct thermodynamic analogue to energy conservation in physics: both a **first law** (the MELT conservation identity: value is conserved in exchange for any price system) and a **second law** (labour as irreversible thermodynamic work, abstract labour as metabolic irreversibility). The Hamiltonian formalism of Goodwin and Flaschel–Semmler describes the conservative redistribution dynamics under simple reproduction; Foley's circuit of capital provides the explicit connection between monetary flows and labour-time accounting. The neoclassical conservation programme fails because its only invariant — the Hicksian expenditure function — exists in unobservable compensated demand space.

**Current papers:**
- [Classical Economic Thermodynamics: The Fundamental Laws of Motion of Value and Social Reproduction](/projects/classical_economic_thermodynamics/) — submitted to *Physica A*
- [The Sraffian Economy as an Autocatalytic Set](/projects/sraffa_acs/) — submitted to *Physical Review E*
- [The Conservation of Value (working paper)](/projects/conservation_of_value/)

---

### Ecological Macroeconomics and Structural Change

My applied and empirical programme. Capitalist economies are structured through complex networks of intermediate production whose topology shapes how shocks propagate, how policies transmit, and whether decarbonisation is feasible without contraction. I develop multi-sector macroeconomic models — integrating Walrasian price dynamics, classical quantity dynamics, and Keynesian demand features — and calibrate them on large input-output databases (EORA, EU KLEMS, WIOD) to study:

- The stabilisation of economic volatility under sectoral price and profit caps
- The macroeconomic implications of circular economy transitions
- The time scales of low-carbon structural change across industries

**Current papers:**
- *Circular economy demand shocks and the macroeconomic implications of ecological exchange* (in revision) — two-region, 54-industry ecological SFC model
- [Stabilizing Economic Fluctuations (JEBO 2023)](/files/publications/valles-codina-2023-jebo.pdf)
- Vallès Codina & Semmler (2024). Time Scales of the Low-Carbon Transition. *Journal of Economics and Statistics*

---

### Production Networks, Complexity, and Crisis

The structure of intermediate production networks determines both the normal dynamics of capitalist economies and the character of their crises. I combine input-output analysis, network theory, and dynamical systems to study:

- **Autocatalytic sets and crisis**: Sraffa's basic commodities as the dominant ACS; keystone sector disruptions as phase transitions (discontinuous ACS collapse) rather than smooth departures from equilibrium
- **Multi-sector eigenvalue dynamics**: how the spectral structure of the input-output matrix (dominant eigenvalue, subdominant eigenvalues, imaginary components) shapes the frequency and amplitude of sectoral oscillations
- **Network centrality and systemic risk**: which sectors are "too central to fail" in the sense that their disruption severs catalytic closure across the network

---

### The Structure of Ecological Unequal Exchange

Ecologically unequal exchange is now measurable at global scale: high-income economies appropriate raw materials, energy, land and labour from lower-income economies in physical volumes far exceeding what they export, while capturing the value added. That result — established in the form given by Dorninger et al. (2021) — is fundamentally **bilateral**, a set of net flows between country groups. This project asks the question bilateral accounting cannot answer: **how is that appropriation organised as a network?**

Bilateral flows say that country A appropriates from country B. They do not say whether appropriation runs through a small set of broker sectors intermediating between peripheral extraction and core consumption; whether the world system decomposes into regional blocs with distinct ecological metabolisms or into a single core–periphery hierarchy; whether a country's position reflects its size or its structural role; or how deep the supply chains are through which appropriation actually travels.

There is a precise reason the network is the right object rather than a borrowed image. Because the matrix of technical coefficients is column-substochastic, the Leontief inverse is the walk-generating function of the production graph, $(I-A)^{-1} = \sum_k A^k$. Leontief multipliers therefore *are* a path-counting centrality in the literal sense. Network measures here inherit an economic interpretation instead of importing a metaphor.

Built on the **GLORIA** multi-regional supply-use tables (release 060, 164 regions × 120 sectors, 2012–2026), parsed in Julia with the Leontief inverse never materialised — every question is a backsolve against a stored factorization, which is what keeps the analysis tractable on ordinary hardware.

**Current output**: [The Structure of Ecological Unequal Exchange](/projects/ecological_unequal_exchange/) — 2019 cross-section complete; network analysis and temporal extension in progress.

---

### History of Economic Thought

Methodological and historical work on the development of value theory, the thermodynamic foundations of political economy, and the relationship between classical and neoclassical research programmes.

- Engagement with Mirowski's *More Heat than Light* (1989) — arguing that the classical tradition, not the neoclassical, provides the correct thermodynamic analogy
- The Cambridge capital controversies and the structural relationship between the LTV and the neoclassical aggregate production function
- Georgescu-Roegen's entropy programme and its relationship to the classical labour theory of value
