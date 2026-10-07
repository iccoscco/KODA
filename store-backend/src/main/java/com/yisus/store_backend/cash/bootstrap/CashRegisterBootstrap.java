package com.yisus.store_backend.cash.bootstrap;

import com.yisus.store_backend.cash.model.CashOpening;
import com.yisus.store_backend.cash.model.CashRegister;
import com.yisus.store_backend.cash.repository.CashOpeningRepository;
import com.yisus.store_backend.cash.repository.CashRegisterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Garantiza al menos una caja y enlaza sesiones antiguas sin {@code cash_register_id}.
 */
@Component
@Order(10)
@RequiredArgsConstructor
public class CashRegisterBootstrap implements ApplicationRunner {

    private final CashRegisterRepository cashRegisterRepository;
    private final CashOpeningRepository cashOpeningRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (cashRegisterRepository.count() == 0) {
            cashRegisterRepository.save(CashRegister.builder()
                    .name("Caja principal")
                    .balance(BigDecimal.ZERO)
                    .build());
        }
        List<CashRegister> registers = cashRegisterRepository.findAllByOrderByIdAsc();
        for (CashRegister cr : registers) {
            if (cr.getName() == null || cr.getName().isBlank()) {
                cr.setName("Caja " + cr.getId());
                cashRegisterRepository.save(cr);
            }
        }
        CashRegister primary = cashRegisterRepository.findAllByOrderByIdAsc().get(0);
        for (CashOpening co : cashOpeningRepository.findAll()) {
            if (co.getCashRegister() == null) {
                co.setCashRegister(primary);
                cashOpeningRepository.save(co);
            }
        }
    }
}
